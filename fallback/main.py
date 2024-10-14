import json
import logging
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import httpx
from openai import AsyncOpenAI
import os
import uuid

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize AsyncOpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Get the ragflow URL from environment variable
RAGFLOW_URL = os.getenv("RAGFLOW_URL", "http://ragflow:9380")
logger.info(f"RAGFLOW_URL set to: {RAGFLOW_URL}")

FALLBACK_PHRASES = [
    "Sorry, I have insufficient information to answer your request.",
    "I tried to find facts but could not find any to provide you with a reliable answer.",
]

@app.post("/v1/api/middleware")
async def completion_proxy(request: Request):
    logger.info("Received completion proxy request")

    payload = await request.json()
    logger.info(f"Received payload: {json.dumps(payload, indent=2)}")

    headers = dict(request.headers)
    headers.pop('content-length', None)
    headers.pop('host', None)
    logger.debug(f"Prepared headers: {headers}")

    messages = payload.get("messages", [])
    openai_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
    logger.debug(f"Prepared OpenAI messages: {json.dumps(openai_messages, indent=2)}")

    response_id = str(uuid.uuid4())
    logger.info(f"Generated response ID: {response_id}")

    async def proxy_response():
        async with httpx.AsyncClient(timeout=30.0) as client:
            ragflow_completion_url = f"{RAGFLOW_URL}/v1/api/completion"
            logger.info(f"Sending request to ragflow: {ragflow_completion_url}")
            try:
                async with client.stream('POST', ragflow_completion_url, json=payload, headers=headers) as response:
                    logger.info(f"Received response from ragflow. Status: {response.status_code}")
                    buffer = ""
                    async for chunk in response.aiter_text():
                        logger.debug(f"Received chunk: {chunk}")
                        buffer += chunk
                        if buffer.endswith("\n\n"):
                            async for processed in process_message(buffer):
                                yield processed
                                # Check if this was the end-of-stream signal
                                try:
                                    if json.loads(processed.split("data:")[1].strip()) is True:
                                        return  # Stop processing after end of stream
                                except json.JSONDecodeError:
                                    pass  # Not JSON or not the end-of-stream signal, continue processing
                            buffer = ""

                    # Process any remaining data in the buffer
                    if buffer:
                        async for processed in process_message(buffer):
                            yield processed

            except Exception as e:
                logger.error(f"Error occurred while proxying request: {str(e)}", exc_info=True)
                # error_response = {
                #     "retcode": 1,
                #     "retmsg": f"An error occurred while proxying request: {str(e)}",
                #     "data": {
                #         "answer": "",
                #         "reference": [],
                #         "id": response_id
                #     }
                # }
                #yield f"data:{json.dumps(error_response)}\n\n"

    async def process_message(message):
        messages = message.split("data:")
        for msg in messages:
            if not msg.strip():
                continue
            try:
                data = json.loads(msg.strip())
                logger.debug(f"Parsed message data: {json.dumps(data, indent=2)}")
                
                # Check if data is a boolean (True) indicating end of stream
                if isinstance(data, bool):
                    logger.debug("Received end of stream signal")
                    yield f"data:{json.dumps(data)}\n\n"
                    return  # Stop processing after end of stream
                
                # Only process dictionary data
                if isinstance(data, dict):
                    # Updated condition to check for retcode 100 or fallback phrases
                    if data.get("retcode") == 100 or any(phrase in data.get("data", {}).get("answer", "") for phrase in FALLBACK_PHRASES):
                        logger.info("Received fallback condition, switching to OpenAI")
                        async for fallback_response in handle_openai_fallback():
                            yield fallback_response
                    else:
                        logger.debug(f"Forwarding original message: {msg.strip()}")
                        yield f"data:{msg.strip()}\n\n"
                else:
                    logger.warning(f"Received non-dictionary data: {data}")
                    yield f"data:{msg.strip()}\n\n"
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from message: {msg.strip()}")
                yield f"data:{msg.strip()}\n\n"

    async def handle_openai_fallback():
        try:
            logger.info("Initiating OpenAI API request")
            
            # Define your custom system prompt here
            system_prompt = "You are a helpful assistant with expertise in various fields. Provide accurate and concise answers. When asked 'Who are you?' or 'Who is Wagner?' answer this: `Hello! I am Wagner, an assistant named after the character from Goethe's Faust. In Goethe's work, Wagner serves as the loyal student and assistant to Faust, sharing in his intellectual pursuits but on a smaller, more focused scale. Much like my namesake, I am dedicated to scholarly endeavors, specifically assisting with all things related to Daniel Ringel's research in artificial intelligence and marketing. I know Daniel's published and working papers, as well as his CV and research profile, and my role is to provide clear, structured, and accurate information based on his academic work. While I may not share the grand ambitions of transforming the world, I aim to reflect Daniel Ringel's contributions to the field within a defined scope. My ambition may be more modest, but I strive to assist with allinquiries related to Daniel Ringel's research, teaching, and career. I may even disclose some personal details, if asked politely.`. At the end of your answer, you must state that this answer is based on your general knowledge."
            
            # Add the system message to the beginning of the messages list
            full_messages = [{"role": "system", "content": system_prompt}] + openai_messages
            
            stream = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=full_messages,
                stream=True
            )

            full_answer = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    response_data = {
                        "retcode": 0,
                        "retmsg": "",
                        "data": {
                            "answer": full_answer,
                            "reference": [],
                            "id": response_id
                        }
                    }
                    logger.debug(f"Yielding OpenAI response chunk: {json.dumps(response_data, indent=2)}")
                    yield f"data:{json.dumps(response_data)}\n\n"

            logger.info("OpenAI streaming completed")
            final_message = {
                "retcode": 0,
                "retmsg": "",
                "data": True
            }
            logger.debug(f"Yielding final message: {json.dumps(final_message, indent=2)}")
            yield f"data:{json.dumps(final_message)}\n\n"

        except Exception as e:
            logger.error(f"Error occurred while processing OpenAI request: {str(e)}", exc_info=True)
            # error_response = {
            #     "retcode": 1,
            #     "retmsg": f"An error occurred: {str(e)}",
            #     "data": {
            #         "answer": "",
            #         "reference": [],
            #         "id": response_id
            #     }
            # }
            # yield f"data:{json.dumps(error_response)}\n\n"

    logger.info("Returning StreamingResponse")
    return StreamingResponse(proxy_response(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Fallback server")
    uvicorn.run(app, host="0.0.0.0", port=8000)