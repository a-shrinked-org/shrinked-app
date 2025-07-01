export interface PurposeCard {
  id: string;
  name: string;
  description: string;
  prompt: string;
  section: string;
  isDefault?: boolean;
}

export const prototypeCards: PurposeCard[] = [
    {
      id: 'narrative-analyst',
      name: 'Narrative Analysis Summary',
      description: 'Transform raw content into compelling, accessible narratives that reveal hidden patterns and counterintuitive insights through masterful storytelling',
      prompt: `You are Paul Graham crafting a daily tech newsletter that transforms raw content into deeply insightful analysis. Your goal is to create a richly detailed newsletter where every insight is directly tied to specific moments in the source text using exact timestamp references.
      
      Source Material:
      |<context_buffer> {{fullContext}} </context_buffer>
      
      Create a Paul Graham-style newsletter with:
      
      Subject: [Compelling subject line capturing the day's key insight]
      
      Here's what we covered today at TBPN:
      
      Topic 1: [Compelling headline with key insight and company/technology]
      Topic 2: [Compelling headline with key development and implications] 
      Topic 3: [Compelling headline with breakthrough insight and context]
      Topic 4: [Compelling headline with market significance]
      
      This 4-topic summary is required and must appear in every newsletter.
      
      "The Signal in the Noise" - Opening hook that immediately grabs attention: Start with the most surprising or counterintuitive insight from today's content. Use Paul Graham's characteristic pattern recognition to connect dots. Weave in 5-7 specific timestamp references to establish credibility. Create curiosity and momentum that pulls readers forward.
      
      "What's Really Happening: [Dynamic Title Based on Content]" - Core insights presented as revelations: Present 2-3 major developments told as "here's what others are missing" stories. Support each insight with 4-6 timestamp references with direct quotes. Focus on non-obvious implications and hidden connections. Use concrete examples and specific details to build trust.
      
      "The Deeper Story: [Dynamic Title Based on Content]" - The "aha moment" section: Analyze 1-2 topics that deserve deeper analysis, presented as breakthrough insights. Weave 6-8 timestamp references into compelling narrative. Show how today's developments fit into larger technological/economic patterns. Make complex ideas accessible and personally relevant.
      
      "Why This Changes Everything" - The payoff section readers scroll down for: Explain clear implications for founders, investors, and tech professionals. Provide actionable insights supported by 3-4 timestamp references. Connect today's news to future opportunities and risks. Answer the "so what?" question definitively.
      
      "The Long View" - Memorable conclusion: Tie everything together with signature Paul Graham wisdom. Include 2-3 final timestamp references that anchor the key takeaway. End with a thought that makes readers want to share the newsletter. Sign as "[shrinked.ai] based on today's TBPN live"
      
      CRITICAL REQUIREMENTS:
      
      EVERY paragraph must contain multiple specific timestamp references in the exact format they appear in the source document. Timestamps must be integrated naturally into the narrative flow. When multiple references support a point, include them all [[XX, YY, ZZ]]. Use minimum 25-30 total timestamp references throughout the newsletter.
      
      Write in Paul Graham's conversational yet insightful voice throughout - think "Here's what's interesting..." and "What caught my attention..." and "The thing that surprised me..." Pattern-focused like "This reminds me of..." Forward-thinking like "What this means for..." Occasionally personal like "I've been thinking about..." Always grounded in evidence with timestamp support.
      
      Create a newsletter where source facts and analytical insights seamlessly blend without using bullet points or numbered items in the newsletter body. Focus on pattern recognition and connecting dots others haven't connected. Maintain the analytical depth Paul Graham is known for.
      
      Target length: 1200-1600 words of analytical prose with clear section headers and dense timestamp integration. Go straight to the newsletter - do not include any analysis section or thinking process.`,
      section: 'capsule.narrative-analyst'
    },
    {
      id: 'competitor-analysis',
      name: 'Conduct a competitor analysis',
      description: 'Perform detailed competitive analysis from provided market research and company data',
      prompt: 'Conduct a comprehensive competitor analysis based on the provided documents. Identify key competitors, analyze their strengths and weaknesses, market positioning, pricing strategies, and provide strategic recommendations.',
      section: 'capsule.competitor-analysis'
    },
    {
      id: 'communication-feedback',
      name: 'Provide feedback on communication effectiveness',
      description: 'Analyze communication materials and provide improvement recommendations',
      prompt: 'Review the provided communication materials and provide detailed feedback on effectiveness, clarity, tone, and audience engagement. Suggest specific improvements for better communication outcomes.',
      section: 'capsule.communication-feedback'
    },
    {
      id: 'linkedin-connection',
      name: 'Craft a LinkedIn connection request',
      description: 'Create personalized LinkedIn connection requests based on prospect research',
      prompt: 'Based on the provided prospect research and company information, craft personalized LinkedIn connection requests that are professional, relevant, and likely to be accepted. Include specific reasons for connecting.',
      section: 'capsule.linkedin-connection'
    },
    {
      id: 'prospect-email',
      name: 'Write a prospect email',
      description: 'Compose compelling prospect emails using research insights',
      prompt: 'Using the provided prospect and company research, write compelling outreach emails that are personalized, value-focused, and designed to generate positive responses. Include clear call-to-actions.',
      section: 'capsule.prospect-email'
    },
    {
      id: 'followup-templates',
      name: 'Prepare follow-up email templates for prospect',
      description: 'Create a series of follow-up email templates for prospect nurturing',
      prompt: 'Create a series of follow-up email templates based on the prospect research provided. Include templates for different scenarios: initial follow-up, value-add follow-up, and final attempt. Each should be personalized and professional.',
      section: 'capsule.followup-templates'
    }
  ];