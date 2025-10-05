import Link from 'next/link';
import { auth, signIn } from '@/lib/auth';
import { CodeSample } from '@/components/CodeSample';

export const dynamic = 'force-dynamic';

export default async function Landing() {
	const session = await auth();
	const isAuthed = !!session?.user;
	return (
		<main className="min-h-[calc(100vh-64px)]">
			<section className="mx-auto max-w-6xl px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
				<div>
					<h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-white">Add modern, phishing‑resistant MFA to your product</h1>
					<p className="mt-4 text-slate-300">Passkeys, email links, and more—policy‑driven per app, with beautiful hosted flows.</p>
					<div className="mt-8 flex gap-3">
									{isAuthed ? (
										<Link href="/dashboard" className="px-5 py-2.5 rounded-lg bg-white/90 text-slate-900 hover:bg-white">Open Dashboard</Link>
									) : (
										<form action={async () => { 'use server'; await signIn('google'); }}>
											<button className="px-5 py-2.5 rounded-lg bg-white/90 text-slate-900 hover:bg-white">Sign in to get started</button>
										</form>
									)}
						<a href="#features" className="px-5 py-2.5 rounded-lg border border-white/20 hover:bg-white/10 text-slate-200">Learn more</a>
					</div>
				</div>
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
					<div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-500/20 to-indigo-500/20" />
					<p className="mt-4 text-sm text-slate-300">Hosted verification UX with passkey and fallback options.</p>
				</div>
			</section>
			<section id="features" className="mx-auto max-w-6xl px-4 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{[
					{ t: 'Passkeys', d: 'Built on WebAuthn for the best UX and phishing resistance.' },
					{ t: 'Policies', d: 'Per-app rules: thresholds, methods, and step-up strategies.' },
					{ t: 'Hosted flows', d: 'Drop-in URLs you can trigger from any stack.' },
					{ t: 'Email OTP', d: 'Low-friction fallback with rate limits and audits.' },
					{ t: 'Auditing', d: 'Session and challenge events recorded for visibility.' },
					{ t: 'Privacy', d: 'Biometrics never leave the device. Keys are scoped to your RP.' },
				].map((f) => (
					<div key={f.t} className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
						<h3 className="font-medium text-white">{f.t}</h3>
						<p className="text-sm text-slate-300 mt-1">{f.d}</p>
					</div>
				))}
			</section>
			<section id="quickstart" className="mx-auto max-w-6xl px-4 pb-24 space-y-4">
				<h2 className="text-2xl font-semibold tracking-tight text-white">Quickstart</h2>
				<p className="text-slate-300 text-sm">Create an MFA session from your app and redirect users to our hosted flow.</p>
				<CodeSample
					title="Create an MFA session"
					language="javascript"
					code={`export async function createMfaSession({ amount, successUrl, email = '' }) {
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const body = {
		appId: 'your app id',
		amount: Number(Number(amount || 0).toFixed(2)),
		currency: 'USD',
		user: { email },
		successUrl,
		failureUrl: \`\${origin}/mfa/failure\`,
	};

	const res = await fetch('https://open-mfa.vercel.app/api/v1/sessions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-merchant-id': 'your merchant id',
			'Authorization': 'your merchant key',
		},
		body: JSON.stringify(body),
	});
}`}
				/>
			</section>
		</main>
	);
}
