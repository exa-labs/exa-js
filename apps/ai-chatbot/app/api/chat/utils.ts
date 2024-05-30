import { ChatCompletionCreateParams } from 'openai/resources/chat/completions'
import Exa from 'exa-js'

const exa = new Exa(process.env.EXA_API_KEY!)

export const functionDescription: ChatCompletionCreateParams.Function = {
  name: 'generate_search_query',
  description:
    'Generates search queries based on user questions about some company. Only generate one search query.',
  parameters: {
    type: 'object',
    properties: {
      companyName: {
        type: 'string',
        description: ' The name of the company to search for'
      }
    },
    required: ['topic']
  }
}

export async function get_current_news(args: { companyName: string }) {
  const lastWeek = new Date().getDate() - 5

  const searchResponse = await exa.searchAndContents(args.companyName, {
    useAutoprompt: true,
    numResults: 1,
    startCrawlDate: new Date(new Date().setDate(lastWeek)).toISOString()
  })

  const text = `${searchResponse.results[0].publishedDate} => ${searchResponse.results[0].text.replace('\n\n', ' ')}`

  return text
}
