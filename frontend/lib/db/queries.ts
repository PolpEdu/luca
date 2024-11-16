import { db } from './index';

export async function getLatestChat({ userId }: { userId: string }) {
  return await db.chats.orderBy('updatedAt').last();
}

export const getChatById = async ({ id }: { id: string }) => {
  return await db.chats.get(id);
};

export const getMessagesByChatId = async ({ id }: { id: string }) => {
  return await db.messages.where('chatId').equals(id).toArray();
};