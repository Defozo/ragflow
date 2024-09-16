import MessageInput from '@/components/message-input';
import MessageItem from '@/components/message-item';
import { MessageType, SharedFrom } from '@/constants/chat';
import { useFetchNextSharedConversation } from '@/hooks/chat-hooks';
import { useSendButtonDisabled } from '@/pages/chat/hooks';
import { Flex, Spin, Button, Space } from 'antd';
import { forwardRef } from 'react';
import {
  useCreateSharedConversationOnMount,
  useGetSharedChatSearchParams,
  useSendSharedMessage,
} from '../shared-hooks';
import { buildMessageItemReference } from '../utils';
import styles from './index.less';

// Add predefined prompts
const predefinedPrompts = [
  "Who is Daniel M. Ringel?",
  "In short, what are the 4 phases of the M4 Framework?",
  "What is the market share of Canon EOS 760D vs Canon EOS 7D Mark II?",
  "What are the potential benefits for managers in adjusting their marketing mix decisions based on insights from M4's maps?",
  "How does ChatGPT-4's agreement with experts differ from its agreement with amateurs in terms of Krippendorff's alpha and classification performance?",
];

import { useState } from 'react';

const ChatContainer = () => {
  const { conversationId } = useCreateSharedConversationOnMount();
  const { data } = useFetchNextSharedConversation(conversationId);

  const [showPredefinedPrompts, setShowPredefinedPrompts] = useState(true);

  const {
    handlePressEnter,
    handleInputChange,
    value,
    sendLoading,
    handleSendMessage, // Ensure this is imported
    loading,
    ref,
    derivedMessages,
  } = useSendSharedMessage(conversationId);

  const sendDisabled = useSendButtonDisabled(value);
  const { from } = useGetSharedChatSearchParams();

  // Modify the function to handle predefined prompt selection and send immediately
  const handlePredefinedPrompt = async (prompt: string) => {
    console.log('Predefined prompt clicked:', prompt);
    
    // Hide predefined prompts
    setShowPredefinedPrompts(false);
    
    // Add the user's message to the conversation immediately
    const userMessage = { id: Date.now().toString(), content: prompt, role: MessageType.Human };
    addNewestConversation(userMessage);
    
    // Send the message
    await handleSendMessage(prompt);
    
    console.log('Message sent');
  };

  // Modify handlePressEnter to hide predefined prompts
  const modifiedHandlePressEnter = (files: File[]) => {
    setShowPredefinedPrompts(false);
    handlePressEnter(files);
  };

  return (
    <>
      <Flex flex={1} className={styles.chatContainer} vertical>
        {showPredefinedPrompts && (
          <div className={styles.predefinedPromptsWrapper}>
            <div className={styles.predefinedPromptsContainer}>
              {predefinedPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  onClick={() => handlePredefinedPrompt(prompt)}
                  className={styles.promptButton}
                  disabled={sendLoading}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Flex flex={1} vertical className={styles.messageContainer}>
          <div>
            <Spin spinning={loading}>
              {derivedMessages?.map((message, i) => {
                return (
                  <MessageItem
                    key={message.id}
                    item={message}
                    nickname="You"
                    reference={buildMessageItemReference(
                      {
                        message: derivedMessages,
                        reference: data?.data?.reference,
                      },
                      message,
                    )}
                    loading={
                      message.role === MessageType.Assistant &&
                      sendLoading &&
                      derivedMessages?.length - 1 === i
                    }
                    index={i}
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
          onPressEnter={modifiedHandlePressEnter}
          sendLoading={sendLoading}
          uploadMethod="external_upload_and_parse"
          showUploadIcon={from === SharedFrom.Chat}
        ></MessageInput>
      </Flex>
    </>
  );
};

export default forwardRef(ChatContainer);