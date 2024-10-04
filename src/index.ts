// package for parsing raw MIME emails (extract headers, body content, attachments)
import * as PostalMime from 'postal-mime';

//this is the function that gets triggered by Cloudflare workers
export default {
	async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		await handleEmail(message, env, ctx);
	},
};

async function handleEmail(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
	const parser = new PostalMime.default();
	const slackWebhookUrl = env.SLACK_WEBHOOK_URL;
	const sharedMailboxAddress = 'yashcrest@gmail.com';

	if (!slackWebhookUrl) {
		throw new Error('SLACK_WEBHOOK_URL is missing in environment variables.');
	}

	try {
		//parse email content
		const rawEmail = new Response(message.raw);
		const email = await parser.parse(await rawEmail.arrayBuffer());

		// Extract general email info
		const from = message.from;
		const to = message.to;
		const subject = email.subject || '(no subject)';
		const content = email.text || '(no content)';

		//Prepare the base Slack Message
		let slackMessage = `📧 *New Email Received* \n\n*From:* ${from}\n*To:* ${to}\n*Subject:* ${subject}\n\n*Content:*\n\`\`\`${content}\`\`\``;

		//check for attachments and add them if they exist
		if (email.attachments && email.attachments.length > 0) {
			let attachmentText = `\n\n*Attachments:*`;
			email.attachments.forEach((attachment, index) => {
				attachmentText += `\n${index + 1}. ${attachment.filename}`;
			});
			slackMessage += attachmentText;
		} else {
			slackMessage += `\n\n*No Attachments*`;
		}

		//forwarding email to slack
		const response = await fetch(slackWebhookUrl, {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			body: JSON.stringify({ text: slackMessage }),
		});

		if (!response.ok) throw new Error(`Failed to post Email to Slack Webhook:  ${response.statusText}`);

		//foward email to shared mailbox
		await message.forward(sharedMailboxAddress);
	} catch (error: any) {
		//reporting any parsing error to Slack as well
		const response = await fetch(slackWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: error.stack }),
		});
	}
}
