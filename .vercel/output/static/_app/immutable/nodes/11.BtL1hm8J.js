import"../chunks/Bzak7iHL.js";import"../chunks/69_IOA4Y.js";import{p as s,f as c,a as g,b as u,c as r,r as i}from"../chunks/jB7C_rnE.js";import{h as p}from"../chunks/CiNhGnpg.js";import{i as h}from"../chunks/BFq3NtvF.js";import{m as d}from"../chunks/BMNPVVsa.js";const l=`## Privacy\r
\r
> Last updated: Sep 15, 2025\r
\r
Basics:\r
\r
- Sign-in: You authenticate with your Hugging Face account.\r
- Conversation history: Stored so you can access past chats; you can delete any conversation at any time from the UI.\r
\r
🗓 Please also consult huggingface.co's main privacy policy at <https://huggingface.co/privacy>. To exercise any of your legal privacy rights, please send an email to <privacy@huggingface.co>.\r
\r
## Data handling and processing\r
\r
HuggingChat uses Hugging Face’s Inference Providers to access models from multiple partners via a single API. Depending on the model and availability, inference runs with the corresponding provider.\r
\r
- Inference Providers documentation: <https://huggingface.co/docs/inference-providers>\r
- Security & Compliance: <https://huggingface.co/docs/inference-providers/security>\r
\r
Security and routing facts\r
\r
- Hugging Face does not store any user data for training purposes.\r
- Hugging Face does not store the request body or the response when routing requests through Hugging Face.\r
- Logs are kept for debugging purposes for up to 30 days, but no user data or tokens are stored in those logs.\r
- Inference Provider routing uses TLS/SSL to encrypt data in transit.\r
- The Hugging Face Hub (which Inference Providers is a feature of) is SOC 2 Type 2 certified. See <https://huggingface.co/docs/hub/security>.\r
\r
External providers are responsible for their own security and data handling. Please consult each provider’s respective security and privacy policies via the Inference Providers documentation linked above.\r
\r
## Technical details\r
\r
[![chat-ui](https://img.shields.io/github/stars/huggingface/chat-ui)](https://github.com/huggingface/chat-ui)\r
\r
The app is completely open source, and further development takes place on the [huggingface/chat-ui](https://github.com/huggingface/chat-ui) GitHub repo. We're always open to contributions!\r
\r
You can find the production configuration for HuggingChat [here](https://github.com/huggingface/chat-ui/blob/main/chart/env/prod.yaml).\r
\r
HuggingChat connects to the OpenAI‑compatible Inference Providers router at \`https://router.huggingface.co/v1\` to access models across multiple providers. Provider selection may be automatic or fixed depending on the model configuration.\r
\r
We welcome any feedback on this app: please participate in the public discussion at <https://huggingface.co/spaces/huggingchat/chat-ui/discussions>\r
\r
<a target="_blank" href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-a-discussion-xl.svg" title="open a discussion"></a>\r
`;var f=c('<div class="overflow-auto p-6 md:pl-14"><div class="prose mx-auto px-4 pb-24 pt-6 dark:prose-invert md:pt-12"><!></div></div>');function S(t,a){s(a,!1),h();var e=f(),n=r(e),o=r(n);p(o,()=>d(l,{gfm:!0})),i(n),i(e),g(t,e),u()}export{S as component};
