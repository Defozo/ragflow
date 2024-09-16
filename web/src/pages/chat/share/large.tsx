import MessageInput from '@/components/message-input';
import MessageItem from '@/components/message-item';
import { MessageType, SharedFrom } from '@/constants/chat';
import { useSendButtonDisabled } from '@/pages/chat/hooks';
import { Flex, Spin, Button } from 'antd';
import { forwardRef } from 'react';
import {
  useCreateSharedConversationOnMount,
  useGetSharedChatSearchParams,
  useSelectCurrentSharedConversation,
  useSendSharedMessage,
} from '../shared-hooks';
import { buildMessageItemReference } from '../utils';
import styles from './index.less';

// Add predefined prompts
const predefinedPrompts = [
  "Who is Daniel?",
  "What are the best practices for API error handling?",
  "How can I optimize my website's performance?",
  "Explain the differences between REST and GraphQL.",
  "What are the key principles of responsive web design?",
];

const ChatContainer = () => {
  const { conversationId } = useCreateSharedConversationOnMount();
  const {
    currentConversation: conversation,
    addNewestConversation,
    removeLatestMessage,
    ref,
    loading,
    setCurrentConversation,
    addNewestAnswer,
  } = useSelectCurrentSharedConversation(conversationId);

  const {
    handlePressEnter,
    handleInputChange,
    value,
    loading: sendLoading,
    handleSendMessage, // Ensure this is imported
  } = useSendSharedMessage(
    conversation,
    addNewestConversation,
    removeLatestMessage,
    setCurrentConversation,
    addNewestAnswer,
  );

  const sendDisabled = useSendButtonDisabled(value);
  const { from } = useGetSharedChatSearchParams();

  // Modify the function to handle predefined prompt selection and send immediately
  const handlePredefinedPrompt = async (prompt: string) => {
    console.log('Predefined prompt clicked:', prompt);
    
    // Add the user's message to the conversation immediately
    const userMessage = { id: Date.now().toString(), content: prompt, role: MessageType.Human };
    addNewestConversation(userMessage); // Pass the correct message object
    
    // Send the message
    await handleSendMessage(prompt);
    
    console.log('Message sent');
  };

  return (
    <>
      <Flex flex={1} className={styles.chatContainer} vertical>
        <Flex className={styles.predefinedPrompts}>
          {predefinedPrompts.map((prompt, index) => (
            <Button
              key={index}
              onClick={() => handlePredefinedPrompt(prompt)}
              className={styles.promptButton}
              disabled={sendLoading} // Disable buttons while sending
            >
              {prompt}
            </Button>
          ))}
        </Flex>

        <Flex flex={1} vertical className={styles.messageContainer}>
          <div>
            <Spin spinning={loading}>
              {conversation?.message?.map((message, i) => {
                return (
                  <MessageItem
                    key={message.id}
                    item={{
                      ...message,
                      role: message.role === MessageType.User ? MessageType.Human : message.role
                    }}
                    nickname={message.role === MessageType.User ? "You" : "Assistant"}
                    reference={buildMessageItemReference(conversation, message)}
                    loading={
                      message.role === MessageType.Assistant &&
                      sendLoading &&
                      conversation?.message.length - 1 === i
                    }
                  ></MessageItem>
                );
              })}
            </Spin>
          </div>
          <div ref={ref} />
        </Flex>

        <MessageInput
          isShared
          value={value}
          disabled={false}
          sendDisabled={sendDisabled}
          conversationId={conversationId}
          onInputChange={handleInputChange}
          onPressEnter={handlePressEnter}
          sendLoading={sendLoading}
          uploadMethod="external_upload_and_parse"
          showUploadIcon={from === SharedFrom.Chat}
        ></MessageInput>
      </Flex>
    </>
  );
};

export default forwardRef(ChatContainer);