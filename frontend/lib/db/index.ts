import Dexie, { Table } from 'dexie'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  chatId: string
  createdAt: Date
}

export interface Chat {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export class MyAppDatabase extends Dexie {
  chats!: Table<Chat>
  messages!: Table<Message>

  constructor() {
    super('myAppDatabase')
    this.version(1).stores({
      chats: 'id, title, createdAt, updatedAt',
      messages: 'id, chatId, role, createdAt'
    })
  }
}

export const db = new MyAppDatabase()

// Initialize the database
export async function initDB() {
  try {
    await db.open()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

export * from './types'