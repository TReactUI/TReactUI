// The commands of a small commander CLI. It is an ordinary program: the only line that
// knows about @trectui is the `announce` call, which does nothing in a real terminal.
import * as prompts from '@clack/prompts'
import { announce } from '@trectui/tty-node'
import { Command } from 'commander'

export const program = new Command()
  .name('tasks')
  .description('A tiny task tool, to try a commander CLI in the browser')

program
  .command('greet')
  .description('Print a greeting')
  .argument('<name>', 'who to greet')
  .option('-s, --shout', 'greet loudly')
  .action((name, options) => {
    const greeting = `Hello, ${name}!`
    console.log(options.shout ? greeting.toUpperCase() : greeting)
  })

program
  .command('countdown')
  .description('Count down, one line a second')
  .argument('[seconds]', 'where to start', '3')
  .action(async seconds => {
    for (let remaining = Number(seconds); remaining > 0; remaining--) {
      console.log(`${remaining}...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.log('Liftoff!')
    announce('Liftoff!')
  })

program
  .command('setup')
  .description('Answer a few questions')
  .action(async () => {
    prompts.intro('Task setup')
    const name = await prompts.text({ message: 'What is your name?', placeholder: 'Ada' })
    if (prompts.isCancel(name)) return prompts.cancel('Cancelled')
    const mode = await prompts.select({
      message: 'How do you want to work?',
      options: [
        { value: 'solo', label: 'On my own' },
        { value: 'team', label: 'With a team' },
      ],
    })
    if (prompts.isCancel(mode)) return prompts.cancel('Cancelled')
    prompts.outro(`Welcome, ${name}. Mode: ${mode}.`)
    announce(`Setup finished for ${name}, working ${mode === 'solo' ? 'on your own' : 'with a team'}`)
  })
