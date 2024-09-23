import { ReactComponent as Avatars } from '@/assets/svg/login-avatars.svg';
import SvgIcon from '@/components/svg-icon';
import { Flex, Rate, Space, Typography } from 'antd';
import classNames from 'classnames';

import { useTranslate } from '@/hooks/common-hooks';
import styles from './index.less';

const { Title, Text } = Typography;

const LoginRightPanel = () => {
  const { t } = useTranslate('login');
  return (
    <section className={styles.rightPanel}>
      <Flex vertical gap={40} style={{ justifyContent: 'space-between', height: '100%' }}>
        <div style={{ flexGrow: 1, minHeight: '85vh' }}></div> {/* Empty div to push the text to the bottom and ensure a minimum height */}
        <Text type="secondary" style={{ color: 'white' }}>
          This is a modified version of the open-source project RAGflow.
        </Text>
      </Flex>
    </section>
  );
};

export default LoginRightPanel;
