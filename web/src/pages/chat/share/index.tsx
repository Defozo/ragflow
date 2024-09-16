import ChatContainer from './large';

import styles from './index.less';

const SharedChat = () => {
  console.log("Rendering ChatContainer");
  return (
    <div className={styles.chatWrapper}>
      <ChatContainer></ChatContainer>
    </div>
  );
};

export default SharedChat;
