import execa from 'execa';
import path from 'path';
import resolveFrom from 'resolve-from';
import load from '.';

const plugin = jest.fn();
const scopedPlugin = jest.fn();

jest.mock('commitlint-plugin-example', () => plugin, {virtual: true});
jest.mock('@scope/commitlint-plugin-example', () => scopedPlugin, {
	virtual: true
});

const {fix, git, npm} = require('@commitlint/test');
const fixture = (name: string) => path.resolve(__dirname, '../fixtures', name);

test('extends-empty should have no rules', async () => {
	const cwd = await git.bootstrap(fixture('extends-empty'));
	const actual = await load({}, {cwd});

	expect(actual.rules).toMatchObject({});
});

test('uses seed as configured', async () => {
	const cwd = await git.bootstrap(fixture('extends-empty'));
	const rules = {'body-case': [1, 'never', 'camel-case'] as any};

	const actual = await load({rules}, {cwd});

	expect(actual.rules['body-case']).toStrictEqual([1, 'never', 'camel-case']);
});

test('rules should be loaded from relative config file', async () => {
	const file = 'config/commitlint.config.js';
	const cwd = await git.bootstrap(fixture('specify-config-file'));
	const rules = {'body-case': [1, 'never', 'camel-case'] as any};

	const actual = await load({rules}, {cwd, file});

	expect(actual.rules['body-case']).toStrictEqual([1, 'never', 'camel-case']);
});

test('rules should be loaded from absolute config file', async () => {
	const cwd = await git.bootstrap(fixture('specify-config-file'));
	const file = path.resolve(cwd, 'config/commitlint.config.js');
	const rules = {'body-case': [1, 'never', 'camel-case'] as any};

	const actual = await load({rules}, {cwd: process.cwd(), file});

	expect(actual.rules['body-case']).toStrictEqual([1, 'never', 'camel-case']);
});

test('plugins should be loaded from seed', async () => {
	const cwd = await git.bootstrap(fixture('extends-empty'));
	const actual = await load({plugins: ['example', '@scope/example']}, {cwd});

	expect(actual.plugins).toMatchObject({
		example: plugin,
		'@scope/example': scopedPlugin
	});
});

test('plugins should be loaded from config', async () => {
	const cwd = await git.bootstrap(fixture('extends-plugins'));
	const actual = await load({}, {cwd});

	expect(actual.plugins).toMatchObject({
		example: plugin,
		'@scope/example': scopedPlugin
	});
});

test('invalid extend should throw', async () => {
	const cwd = await git.bootstrap(fixture('extends-invalid'));

	await expect(load({}, {cwd})).rejects.toThrow();
});

test('empty file should have no rules', async () => {
	const cwd = await git.bootstrap(fixture('empty-object-file'));
	const actual = await load({}, {cwd});

	expect(actual.rules).toMatchObject({});
});

test('empty file should extend nothing', async () => {
	const cwd = await git.bootstrap(fixture('empty-file'));
	const actual = await load({}, {cwd});

	expect(actual.extends).toHaveLength(0);
});

test('respects cwd option', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends/first-extended'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./second-extended'],
		plugins: {},
		rules: {
			one: 1,
			two: 2
		}
	});
});

test('recursive extends', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./first-extended'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1,
			two: 2
		}
	});
});

test('recursive extends with json file', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends-json'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./first-extended'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1,
			two: 2
		}
	});
});

test('recursive extends with yaml file', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends-yaml'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./first-extended'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1,
			two: 2
		}
	});
});

test('recursive extends with js file', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends-js'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./first-extended'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1,
			two: 2
		}
	});
});

test('recursive extends with package.json file', async () => {
	const cwd = await git.bootstrap(fixture('recursive-extends-package'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./first-extended'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1,
			two: 2
		}
	});
});

test('parser preset overwrites completely instead of merging', async () => {
	const cwd = await git.bootstrap(fixture('parser-preset-override'));
	const actual = await load({}, {cwd});

	expect(actual.parserPreset.name).toBe('./custom');
	expect(actual.parserPreset.parserOpts).toMatchObject({
		headerPattern: /.*/
	});
});

test('ignores unknow keys', async () => {
	const cwd = await git.bootstrap(fixture('trash-file'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: [],
		plugins: {},
		rules: {
			foo: 'bar',
			baz: 'bar'
		}
	});
});

test('ignores unknow keys recursively', async () => {
	const cwd = await git.bootstrap(fixture('trash-extend'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: ['./one'],
		plugins: {},
		rules: {
			zero: 0,
			one: 1
		}
	});
});

test('find up from given cwd', async () => {
	const outer = await fix.bootstrap(fixture('outer-scope'));
	await git.init(path.join(outer, 'inner-scope'));
	const cwd = path.join(outer, 'inner-scope', 'child-scope');
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: [],
		plugins: {},
		rules: {
			child: true,
			inner: false,
			outer: false
		}
	});
});

test('find up config from outside current git repo', async () => {
	const outer = await fix.bootstrap(fixture('outer-scope'));
	const cwd = await git.init(path.join(outer, 'inner-scope'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: '@commitlint/format',
		extends: [],
		plugins: {},
		rules: {
			child: false,
			inner: false,
			outer: true
		}
	});
});

test('respects formatter option', async () => {
	const cwd = await git.bootstrap(fixture('formatter'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: 'commitlint-junit',
		extends: [],
		plugins: {},
		rules: {}
	});
});

test('resolves formatter relative from config directory', async () => {
	const cwd = await git.bootstrap(fixture('formatter-local-module'));
	const actual = await load({}, {cwd});

	expect(actual).toMatchObject({
		formatter: resolveFrom(cwd, './formatters/custom.js'),
		extends: [],
		plugins: {},
		rules: {}
	});
});

test('returns formatter name when unable to resolve from config directory', async () => {
	const cwd = await git.bootstrap(fixture('formatter-local-module'));
	const actual = await load({formatter: './doesnt/exists.js'}, {cwd});

	expect(actual).toMatchObject({
		formatter: './doesnt/exists.js',
		extends: [],
		plugins: {},
		rules: {}
	});
});

test('does not mutate config module reference', async () => {
	const file = 'config/commitlint.config.js';
	const cwd = await git.bootstrap(fixture('specify-config-file'));
	const rules = {'body-case': [1, 'never', 'camel-case'] as any};

	const configPath = path.join(cwd, file);
	const before = JSON.stringify(require(configPath));
	await load({rules}, {cwd, file});
	const after = JSON.stringify(require(configPath));

	expect(after).toBe(before);
});

test('resolves parser preset from conventional commits', async () => {
	const cwd = await npm.bootstrap('fixtures/parser-preset-conventionalcommits');
	const actual = await load({}, {cwd});

	expect(actual.parserPreset.name).toBe(
		'conventional-changelog-conventionalcommits'
	);
	expect(typeof (actual as any).parserPreset.parserOpt).toBe('object');
	expect((actual as any).parserPreset.parserOpts.headerPattern).toEqual(
		/^(\w*)(?:\((.*)\))?!?: (.*)$/
	);
});

test('resolves parser preset from conventional angular', async () => {
	const cwd = await npm.bootstrap('fixtures/parser-preset-angular');
	const actual = await load({}, {cwd});

	expect(actual.parserPreset.name).toBe('conventional-changelog-angular');
	expect(typeof (actual as any).parserPreset.parserOpt).toBe('object');
	expect((actual as any).parserPreset.parserOpts.headerPattern).toEqual(
		/^(\w*)(?:\((.*)\))?: (.*)$/
	);
});

test('recursive resolves parser preset from conventional atom', async () => {
	const cwd = await git.bootstrap(
		'fixtures/recursive-parser-preset-conventional-atom'
	);
	// the package file is nested in 2 folders, `npm.bootstrap` cant do that
	await execa('npm', ['install'], {
		cwd: path.resolve(cwd, 'first-extended', 'second-extended')
	});

	const actual = await load({}, {cwd});

	expect(actual.parserPreset.name).toBe('conventional-changelog-atom');
	expect(typeof actual.parserPreset.parserOpts).toBe('object');
	expect((actual as any).parserPreset.parserOpts.headerPattern).toEqual(
		/^(:.*?:) (.*)$/
	);
});
