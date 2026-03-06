// import { prisma } from "$lib/prisma";
// import { json } from "@sveltejs/kit";

// export async function GET() {
//     const words = await prisma.word.findMany();
//     return json(words);
// }

// export async function POST({ request }) {
//     const { data } = await request.json();
    
//     const word = await prisma.word.create({
//         data: {
//           word: data.word,
//           meanings: {
//             create: data.meanings.map((meaning: any) => ({
//               type: meaning.partOfSpeech,
//               dictionaryMeaning: meaning.dictionaryMeaning,
//               personalMeaning: meaning.personalMeaning,
//               examples: {
//                 create: meaning.examples
//               }
//             }))
//           }
//         },
//         include: {
//           meanings: {
//             include: {
//               examples: true
//             }
//           }
//         }
//       })
//     return json(word);
// }