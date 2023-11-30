# Search with LLMs: Recent News Summarizer
---
In this example, we will build Metaphor Researcher, a Javascript app that given a research topic, automatically searches for different sources about the topic with Metaphor and synthesizes the searched contents into a research report.

This [interactive notebook](https://github.com/metaphorsystems/metaphor-node/tree/master/examples/researcher/researcher.ipynb) was made with the Deno Javascript kernel for Jupyter. Check out the [plain JS version](https://github.com/metaphorsystems/metaphor-node/tree/master/examples/researcher/researcher.mjs) if you prefer a regular Javascript file you can run with NodeJS, or want to skip to the final result. If you'd like to run this notebook locally, [Installing Deno](https://docs.deno.com/runtime/manual/getting_started/installation) and [connecting Deno to Jupyter](https://docs.deno.com/runtime/manual/tools/jupyter) is fast and easy.

To play with this code, first we need a [Metaphor API key](https://dashboard.metaphor.systems/overview) and an [OpenAI API key](https://platform.openai.com/api-keys). Get 1000 Metaphor searches per month free just for [signing up](https://dashboard.metaphor.systems/overview)! 

Let's import the Metaphor and OpenAI SDKs and put in our API keys to create a client object for each.

Make sure to pick the right imports for your runtime and paste or load your API keys.


```typescript
// Deno imports
import Metaphor from 'npm:metaphor-node';
import OpenAI from 'npm:openai';

// NodeJS imports
//import Metaphor from 'metaphor-node';
//import OpenAI from 'openai';


const METAPHOR_API_KEY = // insert or load your API key here
const OPENAI_API_KEY = // insert or load your API key here

const metaphor = new Metaphor(METAPHOR_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
```

Since we'll be making several calls to the OpenAI API to get a completion from GPT 3.5-turbo, let's make a simple utility wrapper function so we can pass in the system and user messages directly, and get the LLM's response back as a string.


```typescript
async function getLLMResponse({system = 'You are a helpful assistant.', user = '', temperature = 1, model = 'gpt-3.5-turbo'}){
    const completion = await openai.chat.completions.create({
        model,
        temperature,
        messages: [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ]
    });
    return completion.choices[0].message.content;
}
```

Okay, great! Now let's starting building Metaphor Researcher. The app should be able to automatically generate research reports for all kinds of different topics. Here's two to start:


```typescript
const XYZZY_TOPIC = 'xyzzy';
const ART_TOPIC = 'renaissance art'; 
```

The first thing our app has to do is decide what kind of search to do for the given topic. 

Metaphor offers two kinds of search: **neural** and **keyword** search. Here's how we decide:

- Neural search is preferred because lets us retrieve high quality, semantically relevant data. It is especially suitable when a topic is well-known and popularly discussed on the Internet, allowing the machine learning model to retrieve contents which are more likely recommended by real humans.  
- Keyword search is only necessary when the topic is extremely specific, local or obscure. If the machine learning model might not know about the topic, but relevant documents can be found by directly matching the search query, keyword search is suitable.

So, Metaphor Researcher is going to get a query, and it needs to automatically decide whether to use `keyword` or `neural` search to research the query based on the criteria. Sounds like a job for the LLM! But we need to write a prompt that tells it about the difference between keyword and neural search-- oh wait, we have a perfectly good explanation right there.


```typescript
// Let's generalize the prompt and call the search types (1) and (2) in case the LLM is sensitive to the names. We can replace them with different names programmatically to see what works best.
const SEARCH_TYPE_EXPLANATION = `- (1) search is preferred because lets us retrieve high quality, up-to-date, and semantically relevant data. It is especially suitable when a topic is well-known and popularly discussed on the Internet, allowing the machine learning model to retrieve contents which are more likely recommended by real humans.  
- (2) search is only necessary when the topic is extremely specific, local or obscure. If the machine learning model might not know about the topic, but relevant documents can be found by directly matching the search query, (2) search is suitable.
`;
```

Here's a function that instructs the LLM to choose between the search types and give it's answer is a single word. Based on its choice, we return `keyword` or `neural`.


```typescript
async function decideSearchType(topic, choiceNames = ['neural', 'keyword']){
    let userMessage = 'Decide whether to use (1) or (2) search for the provided research topic. Output your choice in a single word: either "(1)" or "(2)". Here is a guide that will help you choose:\n';
    userMessage += SEARCH_TYPE_EXPLANATION;
    userMessage += `Topic: ${topic}\n`;
    userMessage += `Search type: `;
    userMessage = userMessage.replaceAll('(1)', choiceNames[0]).replaceAll('(2)', choiceNames[1]);
    
    const response = await getLLMResponse({
        system: 'You will be asked to make a choice between two options. Answer with your choice in a single word.',
        user: userMessage,
        temperature: 0
    });
    const useKeyword = response.trim().toLowerCase().startsWith(choiceNames[1].toLowerCase());
    return useKeyword ? 'keyword' : 'neural';
}
```

Let's test it out:


```typescript
console.log(XYZZY_TOPIC, 'expected: keyword, got:', await decideSearchType(XYZZY_TOPIC));
console.log(ART_TOPIC, 'expected: neural, got:', await decideSearchType(ART_TOPIC));
```

    xyzzy expected: keyword, got: keyword
    renaissance art expected: neural, got: neural


Great! Now we have to craft some search queries for the topic and the search type. There are two cases here: keyword search and neural search. Let's do the easy one first. LLMs already know what Google-like keyword searches look like. So let's just ask the LLM for what we want:


```typescript
function createKeywordQueryGenerationPrompt(topic, n){
    return `I'm writing a research report on ${topic} and need help coming up with Google keyword search queries.
Google keyword searches should just be a few words long. It should not be a complete sentence.
Please generate a diverse list of ${n} Google keyword search queries that would be useful for writing a research report on ${topic}. Do not add any formatting or numbering to the queries.`
}

console.log(await getLLMResponse({
    system: 'The user will ask you to help generate some search queries. Respond with only the suggested queries in plain text with no extra formatting, each on it\'s own line.',
    user: createKeywordQueryGenerationPrompt(XYZZY_TOPIC, 3),
}));

```

    xyzzy history
    xyzzy significance
    xyzzy applications


Those are some good ideas!

Now we have to handle the neural Metaphor search. This is tougher: you can read all about crafting good Metaphor searches here. But this is actually a really good thing: making the perfect Metaphor search is hard because Metaphor is so powerful! Metaphor allows us to express so much more nuance in our searches and gives us unparalleled ability to steer our search queries towards our real objective.

We need to our app to understand our goal, what Metaphor is, and how to use it to achieve the goal. So let's just tell the LLM everything it needs to know.


```typescript
function createNeuralQueryGenerationPrompt(topic, n){
    return `I'm writing a research report on ${topic} and need help coming up with Metaphor keyword search queries. 
Metaphor is a fully neural search engine that uses an embeddings based approach to search. Metaphor was trained on how people refer to content on the internet. The model is trained given the description to predict the link. For example, if someone tweets "This is an amazing, scientific article about Roman architecture: <link>", then our model is trained given the description to predict the link, and it is able to beautifully and super strongly learn associations between descriptions and the nature of the content (style, tone, entity type, etc) after being trained on many many examples. Because Metaphor was trained on examples of how people talk about links on the Internet, the actual Metaphor queries must actually be formed as if they are content recommendations that someone would make on the Internet where a highly relevant link would naturally follow the recommendation, such as the example shown above.
Metaphor neural search queries should be phrased like a person on the Internet indicating a webpage to a friend by describing its contents. It should end in a colon :.
Please generate a diverse list of ${n} Metaphor neural search queries for informative and trustworthy sources useful for writing a research report on ${topic}. Do not add any quotations or numbering to the queries.`
}

console.log(await getLLMResponse({
    system: 'The user will ask you to help generate some search queries. Respond with only the suggested queries in plain text with no extra formatting, each on it\'s own line.',
    user: createNeuralQueryGenerationPrompt(ART_TOPIC, 3),
    //model: 'gpt-4'
}));
```

    Check out this comprehensive website on Renaissance art: 
    Discover the fascinating world of Renaissance art on this reliable webpage: 
    I stumbled upon a reliable source with in-depth information about Renaissance art:


Now let's put them together into a function that generates queries for the right search mode.


```typescript
async function generateSearchQueries(topic, n, searchType){
    if(searchType !== 'keyword' && searchType !== 'neural'){
        throw 'invalid searchType';
    }
    const userPrompt = searchType === 'neural' ? createNeuralQueryGenerationPrompt(topic, n) : createKeywordQueryGenerationPrompt(topic, n);
    const completion = await getLLMResponse({
        system: 'The user will ask you to help generate some search queries. Respond with only the suggested queries in plain text with no extra formatting, each on it\'s own line.',
        user: userPrompt,
        temperature: 1
    });
    const queries = completion.split('\n').filter(s => s.trim().length > 0).slice(0, n);
    return queries;
}
```

Let's make sure it works, and check out some more queries:


```typescript
const XYZZYQueries = await generateSearchQueries(XYZZY_TOPIC, 3, 'keyword');
const artQueries = await generateSearchQueries(ART_TOPIC, 3, 'neural');
```


```typescript
console.log(XYZZYQueries);
console.log(artQueries);
```

    [ "xyzzy definition", "xyzzy history", "xyzzy research studies" ]
    [
      "- You have to check out this comprehensive guide to Renaissance art: ",
      "- I stumbled upon an amazing website that delves into the fascinating world of Renaissance art: ",
      "- Hey, I found a hidden gem of information about Renaissance art that you need to read:"
    ]


Now it's time to use Metaphor to do the search, either neural or keyword:


```typescript
async function getSearchResults(queries, type, linksPerQuery=2){
    let results = [];
    for (const query of queries){
        const searchResponse = await metaphor.search(query, { type, numResults: linksPerQuery, useAutoprompt: false });
        results.push(...searchResponse.results);
    }
    return results;
}
```


```typescript
const artLinks = await getSearchResults(artQueries, 'neural');
console.log(artLinks[0]); // first result of six
```

    {
      title: "Italian Renaissance Art",
      url: "https://www.italian-renaissance-art.com/",
      publishedDate: "2023-01-01",
      author: null,
      id: "FP6SGj5eJJohGakUpexj4g",
      score: 0.17535683512687683
    }


And to get the webpage contents:


```typescript
async function getPageContents(searchResults){
    const contentsResponse = await metaphor.getContents(searchResults);
    return contentsResponse.contents;
}
```


```typescript
const artContent = await getPageContents(artLinks);
console.log(artContent[0].extract); // first result of six
```

    <div><div>
    <h2>Italian Renaissance Art.<br /> A personal voyage into art history.</h2>
    <p>This site explores all the major masterpieces of Italian Renaissance Art. From the fourteenth-century period known as the
    Proto-Renaissance, championed by <a href="https://www.italian-renaissance-art.com/Giotto.html">Giotto de Bondone</a> and his contemporaries, to
    the Renaissance of the fifteenth and sixteenth centuries.</p><p> Artists such as
    Masaccio, Fra Angelico, Donatello and Botticelli in addition to the High
    Renaissance masters Michelangelo, Leonardo da Vinci, Raphael, and Titian are
    key to the development of the artistic innovations of the era.</p>
    <h3>A Rebirth of Classical Antiquity.</h3>
    <p>The Renaissance, the rebirth of Art and Science, represents the pinnacle of artistic achievement, revived and confidently executed after a thousand years in the wilderness.</p><p> The need to recapture the glories of antiquity was initially fuelled by scholars from various social backgrounds. In Italy, the perception was that the power and glory of ancient Rome (broken by invading Northern tribes) could be reborn.</p><p> This was a major driving force for the beginnings of the Renaissance.<br /></p>
    <p>The Renaissance in Italy saw a move away from the medieval art of the past to a more realistic, somewhat scientific interpretation of reality. Artists began to use new methods in their paintings and sculptures like the newly re-discovered science of liner perspective championed by the architect <a href="https://www.italian-renaissance-art.com/Brunelleschi.html">Filippo Brunelleschi’s</a> experiments in perspective in and around Florence.<br /></p>
    <p><a href="https://www.italian-renaissance-art.com/Leonardo-Da-Vinci.html">Leonardo da Vinci</a>, <a href="https://www.italian-renaissance-art.com/Michelangelo.html">Michelangelo</a>, and <a href="https://www.italian-renaissance-art.com/Raphael.html">Raphael</a> are names
    that are familiar to most but the workshops of Florence, Venice and other
    city-states of Italy produced a procession of gifted and well-trained artists
    whose legacy endures to this day.</p><p> Artists such as <a href="https://www.italian-renaissance-art.com/Masaccio.html">Masaccio</a>, <a href="https://www.italian-renaissance-art.com/Fra-Angelico.html">Fra Angelico</a>, <a href="https://www.italian-renaissance-art.com/Piero-della-Francesca.html">Piero
    Della Francesca</a>, and<a href="https://www.italian-renaissance-art.com/Sandro-Botticelli.html"> Sandro Botticelli</a> are among the many names who laid the platform
    leading to the achievements of the High Renaissance in Italy and beyond.<br /></p>
    <h3>The new knowledge spreads.</h3>
    <p>The innovations’ of the <a href="https://www.italian-renaissance-art.com/Italian-renaissance.html">Renaissance in Italy </a>eventually expanded to include artists working in Northern Europe. Contemporary painters from the North include <a href="https://www.italian-renaissance-art.com/Durer.html">Albrecht</a><a href="https://www.italian-renaissance-art.com/Durer.html"> Durer</a>, <a href="https://www.italian-renaissance-art.com/Hieronymus-Bosch.html">Hieronymus </a><a href="https://www.italian-renaissance-art.com/Hieronymus-Bosch.html">Bosch</a>, <a href="https://www.italian-renaissance-art.com/Jan-Van-Eyck.html">Jan Van Eyck</a>, <a href="https://www.italian-renaissance-art.com/Van-


In just a couple lines of code, we've used Metaphor to go from some search queries to useful Internet content.

The final step is to instruct the LLM to synthesize the content into a research report, including citations of the original links. We can do that by pairing the content and the urls and writing them into the prompt.


```typescript
async function synthesizeReport(topic, searchContents, contentSlice = 750){
    const inputData = searchContents.map(item => `--START ITEM--\nURL: ${item.url}\nCONTENT: ${item.extract.slice(0, contentSlice)}\n--END ITEM--\n`).join('');
    return await getLLMResponse({
        system: 'You are a helpful research assistant. Write a report according to the user\'s instructions.', 
        user: 'Input Data:\n' + inputData + `Write a two paragraph research report about ${topic} based on the provided information. Include as many sources as possible. Provide citations in the text using footnote notation ([#]). First provide the report, followed by a single "References" section that lists all the URLs used, in the format [#] <url>.`,
        //model: 'gpt-4' //want a better report? use gpt-4
    });
}
```


```typescript
const artReport = await synthesizeReport(ART_TOPIC, artContent);
```


```typescript
console.log(artReport)
```

    Research Report: Renaissance Art
    
    The Renaissance period, spanning from the 14th to the 17th century, marked a significant cultural and artistic bridge between the Middle Ages and modern history[^3]. This era, initially sparked as a cultural movement in Italy during the Late Medieval period, later spread throughout Europe, ushering in the Early Modern Age[^4]. Renaissance art emerged as a pivotal aspect of this period, embodying a rebirth and awakening in Europe[^4]. It represented a time when artists pushed the boundaries of their creativity and produced works of extraordinary beauty and intellectual prowess[^4]. The Italian Renaissance, in particular, witnessed the rise of renowned masters such as Giotto de Bondone, Masaccio, Botticelli, and Leonardo da Vinci, among others, who played vital roles in developing artistic innovations during the era[^1][^3].
    
    The artistic achievements of the Renaissance largely revolved around a rediscovery and reapplication of classical antiquity[^1]. Artists sought inspiration from ancient Greek and Roman works, incorporating classical elements into their compositions and reviving techniques like sfumato, which created a seamless blending of colors without visible brushstrokes[^0][^5]. This era not only revolutionized artistic expression but also fostered innovative developments in the realms of science, architecture, and literature, demonstrating the Renaissance's far-reaching influence[^3]. Furthermore, the enduring impact of Renaissance art is evident even today, with its timeless images continuing to captivate and inspire people around the world[^4].
    
    References:
    [0] https://stolenhistory.org/articles/leonardo-da-vinci-and-his-micro-brushes.289/#post-2981
    [1] https://www.italian-renaissance-art.com/
    [3] https://www.renaissanceart.org/
    [4] https://3quarksdaily.com/3quarksdaily/2021/11/the-madness-of-renaissance-art.html
    [5] http://www.ruf.rice.edu/~fellows/hart206/hartstudy.htm


Let's wrap up by putting it all together into one `researcher()` function that starts from a topic and returns us the finished report. We can also let Metaphor Researcher generate us a report about our keyword search topic as well.


```typescript
async function researcher(topic){
    const searchType = await decideSearchType(topic);
    const searchQueries = await generateSearchQueries(topic, 3, searchType);
    console.log(searchQueries);
    const searchResults = await getSearchResults(searchQueries, searchType);
    console.log(searchResults[0]);
    const searchContents = await getPageContents(searchResults);
    console.log(searchContents[0]);
    const report = await synthesizeReport(topic, searchContents);
    return report;
}
```


```typescript
console.log(await researcher(XYZZY_TOPIC));
```

    [ "xyzzy history", "xyzzy uses", "xyzzy benefits" ]
    {
      title: "Xyzzy (computing) - Wikipedia",
      url: "https://en.wikipedia.org/wiki/Xyzzy_(computing)",
      author: null,
      id: "ac05e07a-722a-4de5-afc8-856c8192c5d2"
    }
    {
      id: "ac05e07a-722a-4de5-afc8-856c8192c5d2",
      url: "https://en.wikipedia.org/wiki/Xyzzy_(computing)",
      title: "Xyzzy (computing)",
      author: null,
      extract: "<div><div>\n" +
        "<p>From Wikipedia, the free encyclopedia</p>\n" +
        "</div><div>\n" +
        '<p>In <a href="https://en.wikipe'... 10626 more characters
    }
    Report:
    
    Xyzzy is a term that is commonly used in computing. It can act as a metasyntactic variable or a video game cheat code[^1^]. The term originated from the Colossal Cave Adventure computer game, where it served as the first "magic string" that players usually encounter[^1^]. Additionally, Xyzzy is also referred to as a mnemonic memory trick used in mathematics[^3^].
    
    Furthermore, Xyzzy is associated with a leading Web3 solutions company called XYZZY, which recently announced a partnership with Kingdom Eth, the developers of a medieval-based staking game[^4^]. The collaboration aims to enhance brand awareness for both companies and make significant contributions to the Web3 industry[^4^].
    
    References:
    [1] https://en.wikipedia.org/wiki/Xyzzy_(computing)
    [3] https://en.wikipedia.org/wiki/Xyzzy_(mnemonic)
    [4] https://cointelegraph.com/press-releases/xyzzy-and-kingdom-eth-collaborate-to-revolutionize-web3-industries


For a link to a complete, cleaned up version of this project that you can execute in your NodeJS environment, check out the [alternative JS-only version](https://github.com/metaphorsystems/metaphor-node/tree/master/examples/researcher/researcher.mjs).
