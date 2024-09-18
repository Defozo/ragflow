import MessageInput from '@/components/message-input';
import MessageItem from '@/components/message-item';
import { MessageType, SharedFrom } from '@/constants/chat';
import { useFetchNextSharedConversation } from '@/hooks/chat-hooks';
import { useSendButtonDisabled } from '@/pages/chat/hooks';
import { Flex, Spin, Button } from 'antd';
import { forwardRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
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
  "Sum up findings from \"Creating Synthetic Experts with Generative Artificial Intelligence\"",
  "What are the potential benefits for managers in adjusting their marketing mix decisions based on insights from M4's maps?",
  "How does ChatGPT-4's agreement with experts differ from its agreement with amateurs in terms of Krippendorff's alpha and classification performance?",
];

const ChatContainer = () => {
  const { conversationId } = useCreateSharedConversationOnMount();
  const { data } = useFetchNextSharedConversation(conversationId);

  const {
    handlePressEnter,
    handleInputChange,
    value,
    sendLoading,
    loading,
    ref,
    derivedMessages,
    handleSendMessage,
    addNewestQuestion,
  } = useSendSharedMessage(conversationId);
  const sendDisabled = useSendButtonDisabled(value);
  const { from } = useGetSharedChatSearchParams();

  const [showPredefinedPrompts, setShowPredefinedPrompts] = useState(true);

  const handlePredefinedPrompt = (prompt: string) => {
    console.log('Predefined prompt clicked:', prompt);
    setShowPredefinedPrompts(false);
    const id = uuid();
    
    const userMessage = {
      content: prompt.trim(),
      id,
      role: MessageType.User,
    };
    
    addNewestQuestion(userMessage);
    handleSendMessage(userMessage);
  };

  return (
    <>
      <Flex flex={1} className={styles.chatContainer} vertical>
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
          
          {showPredefinedPrompts && (
            <div className={styles.predefinedPromptsContainer}>
              {predefinedPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  onClick={() => handlePredefinedPrompt(prompt)}
                  className={`${styles.promptButton} ${styles.wrapText}`}
                  disabled={sendLoading}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          )}
          
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