import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const extractorModel = openai("gpt-4o-mini");

/**
 * Extracts a concise answer from policy content based on user query
 * Returns only the relevant information in 1-2 sentences
 */
export async function extractPolicyAnswer(
  userQuery: string,
  policyContent: string,
): Promise<string> {
  const prompt = `You are a customer service assistant. A user asked: "${userQuery}"

Below is a policy document. Extract ONLY the specific information that directly answers the user's question. 

Rules:
- Answer in 1-2 sentences maximum
- Start with Yes/No/It depends if the question asks for it
- Include only the reason relevant to the answer
- Use natural, conversational language
- Do NOT use markdown, bullets, or numbered lists
- Do NOT quote the policy text verbatim
- Do NOT include headings or separators
- Do NOT provide contact info unless explicitly asked

Policy document:
${policyContent}

Answer:`;

  try {
    const result = await generateText({
      model: extractorModel,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 150,
      temperature: 0.3,
    });

    const answer = result.text.trim();

    // Ensure answer is concise (max 2 sentences)
    const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 2) {
      return sentences.slice(0, 2).join(". ").trim() + ".";
    }

    return answer;
  } catch (error) {
    console.error("Error extracting policy answer:", error);
    // Fallback: return a generic message instead of full policy
    return "I found information about this policy, but encountered an error processing it. Please contact customer support for details.";
  }
}
