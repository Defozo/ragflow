export enum MessageType {
  Assistant = 'assistant',
  User = 'user',
  Human = "Human",
}

export const variableEnabledFieldMap = {
  temperatureEnabled: 'temperature',
  topPEnabled: 'top_p',
  presencePenaltyEnabled: 'presence_penalty',
  frequencyPenaltyEnabled: 'frequency_penalty',
  maxTokensEnabled: 'max_tokens',
};

export enum SharedFrom {
  Agent = 'agent',
  Chat = 'chat',
}

export enum ChatSearchParams {
  DialogId = 'dialogId',
  ConversationId = 'conversationId',
}

export const EmptyConversationId = 'empty';
