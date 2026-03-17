import type { Build, PluginBuilder } from 'bun';
import { mkdirSync, cpSync } from 'fs';
import { join } from 'path';

import { version, name as projName } from './package.json' with {
	type: 'json',
};

const args = process.argv.slice(2);
const targetArg =
	args.find((a) => a.startsWith('--target='))?.split('=')[1] ?? 'all';

const DIST = join(import.meta.dir, 'dist');
const ENTRY = join(import.meta.dir, 'src', 'index.ts');

const targets: Record<string, Build.CompileTarget> = {
	windows: 'bun-windows-x64',
	linux: 'bun-linux-x64',
} as const;

console.log('\n📦 Compiling binaries...');

const toBuild =
	targetArg === 'all'
		? Object.entries(targets)
		: [[targetArg, targets[targetArg as keyof typeof targets]]];

const stripDevLabels = {
	name: 'strip-dev-labels',
	setup(build: PluginBuilder) {
		build.onLoad({ filter: /\.(ts|tsx)$/ }, async (args: any) => {
			const text = await Bun.file(args.path).text();
			return {
				contents: text.replaceAll(/^\s*DEV:.*$/gm, ''),
				loader: 'ts',
			};
		});
	},
};

for (const [buildName, target] of toBuild) {
	const ext = buildName === 'windows' ? '.exe' : '';
	const filename = `${projName}-${buildName}`;

	console.log(`  → ${buildName}: ${filename}${ext}`);

	const buildSettings = {
		entrypoints: [ENTRY],
		outdir: DIST,
		compile: {
			target: target as Build.CompileTarget,
			outfile: join(DIST, `${filename}${ext}`),
		},
		define: {
			'process.env.NODE_ENV': JSON.stringify('production'),
			'process.env.VERSION': JSON.stringify(version),
		},
		plugins: [stripDevLabels],
	};

	await Bun.build(buildSettings);
}

console.log('\n✅ Build complete!\n');
