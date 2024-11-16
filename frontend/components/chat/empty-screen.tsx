import { Button } from "../ui/button"
import { ArrowRight } from "lucide-react"
export function EmptyScreen({ setInput }: { setInput: (value: string) => void }) {
    return (
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-background p-8">
          <h1 className="mb-2 text-lg font-semibold">
            Welcome to AI Chat Assistant!
          </h1>
          <p className="mb-2 leading-normal text-muted-foreground">
            This is a chat application using local storage for offline functionality.
          </p>
          <p className="leading-normal text-muted-foreground">
            You can start a conversation here or try the following examples:
          </p>
          <div className="mt-4 flex flex-col items-start space-y-2">
            {exampleMessages.map((message, index) => (
              <Button
                key={index}
                variant="link"
                className="h-auto p-0 text-base"
                onClick={() => setInput(message)}
              >
                <ArrowRight className="mr-2 text-muted-foreground" />
                {message}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const exampleMessages = [
    'Tell me about yourself',
    'What can you help me with?',
    'How does this chat work?'
  ]