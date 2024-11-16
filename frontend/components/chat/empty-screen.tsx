import { Button } from "../ui/button"
import { ArrowRight, Send, Split, Repeat, DollarSign } from "lucide-react"
import Image from "next/image"
import icon from '@/public/images/eva-icon.svg'

export function EmptyScreen({ setInput }: { setInput: (value: string) => void }) {

  const suggestions = [
    {
      icon: <Send className="text-blue-400 !size-6" />,
      text: 'Send 5 USDC to a friend'
    },
    {
      icon: <Split className="text-blue-400 !size-6" />,
      text: 'Split account'
    },
    {
      icon: <Repeat className="text-blue-400 !size-6" />,
      text: 'Swap 5 USDC for EURC'
    },
    {
      icon: <DollarSign className="text-blue-400 !size-6" />,
      text: 'Show my portfolio value in USD'
    }
  ]

  return (
    <div className="h-full flex flex-col justify-center items-center max-w-2xl p-4 gap-24">
      <div className="h-fit flex flex-col justify-center items-center gap-2 text-white text-center">
        <Image src={icon} alt="EVA Icon" width={41} height={40} className="mb-4" />
        <h1 className="text-3xl font-bold">
          Chat with EVA
        </h1>
        <p className="leading-normal font-normal tracking-wide">
          Looking to simplify your crypto experience?<br />
          Let EVA handle it for you effortlessly.
        </p>
      </div>
      <div>

        <div className="mt-4 flex flex-row flex-wrap gap-3 w-full justify-center">
          {suggestions.map((message, index) => (
            <Button
              key={index}
              variant="ghost"
              className="h-auto w-fit max-w-[12rem] flex items-center justify-center gap-3 px-4 py-3 
                         border-[3px] border-secondary bg-transparent hover:bg-secondary hover:text-white text-white rounded-2xl"
              onClick={() => setInput(message.text)}
            >
              <div className="text-blue-400 shrink-0">
                {message.icon}
              </div>
              <span className="text-sm font-medium whitespace-normal text-left">
                {message.text}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}