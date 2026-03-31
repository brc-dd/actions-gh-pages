import {copyAssets, setRepo, configureCommitter, getCommitMessage} from '../src/git-utils';
import {getInputs} from '../src/get-inputs';
import {Inputs} from '../src/interfaces';
import {getWorkDirName, createDir} from '../src/utils';
import {CmdResult} from '../src/interfaces';
import * as exec from '@actions/exec';
import {cp, rm} from 'shelljs';
import path from 'path';
import fs from 'fs';

const testRoot = path.resolve(__dirname);

async function createTestDir(name: string): Promise<string> {
  const date = new Date();
  const unixTime = date.getTime();
  return await getWorkDirName(`${unixTime}_${name}`);
}

function writeFixtureFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
}

describe('copyAssets', () => {
  let gitTempDir = '';
  (async (): Promise<void> => {
    const date = new Date();
    const unixTime = date.getTime();
    gitTempDir = await getWorkDirName(`${unixTime}_git`);
  })();

  beforeAll(async () => {
    await createDir(gitTempDir);
    process.chdir(gitTempDir);
    await exec.exec('git', ['init']);
  });

  test('copy assets from publish_dir to root, delete .github', async () => {
    const publishDir = await createTestDir('src');
    const destDir = await createTestDir('dst');
    cp('-Rf', path.resolve(testRoot, 'fixtures/publish_dir_1'), publishDir);
    cp('-Rf', gitTempDir, destDir);

    await copyAssets(publishDir, destDir, '.github');
    expect(fs.existsSync(path.resolve(destDir, '.github'))).toBeFalsy();
    expect(fs.existsSync(path.resolve(destDir, 'index.html'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.css'))).toBeTruthy();
    rm('-rf', publishDir, destDir);
  });

  test('copy assets from publish_dir to root, delete .github,main.js', async () => {
    const publishDir = await createTestDir('src');
    const destDir = await createTestDir('dst');
    cp('-Rf', path.resolve(testRoot, 'fixtures/publish_dir_1'), publishDir);
    cp('-Rf', gitTempDir, destDir);

    await copyAssets(publishDir, destDir, '.github,main.js');
    expect(fs.existsSync(path.resolve(destDir, '.github'))).toBeFalsy();
    expect(fs.existsSync(path.resolve(destDir, 'index.html'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'main.js'))).toBeFalsy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.css'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.js'))).toBeTruthy();
    rm('-rf', publishDir, destDir);
  });

  test('copy assets from publish_dir to root, delete nothing', async () => {
    const publishDir = await createTestDir('src');
    const destDir = await createTestDir('dst');
    cp('-Rf', path.resolve(testRoot, 'fixtures/publish_dir_root'), publishDir);
    cp('-Rf', gitTempDir, destDir);

    await copyAssets(publishDir, destDir, '');
    expect(fs.existsSync(path.resolve(destDir, '.github'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'index.html'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'main.js'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.css'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.js'))).toBeTruthy();
    rm('-rf', publishDir, destDir);
  });

  test('copy assets from root to root, delete .github', async () => {
    const publishDir = await createTestDir('src');
    const destDir = await createTestDir('dst');
    cp('-Rf', path.resolve(testRoot, 'fixtures/publish_dir_root'), publishDir);
    cp('-Rf', gitTempDir, destDir);
    cp('-Rf', gitTempDir, publishDir);

    await copyAssets(publishDir, destDir, '.github');
    expect(fs.existsSync(path.resolve(destDir, '.github'))).toBeFalsy();
    expect(fs.existsSync(path.resolve(destDir, 'index.html'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.css'))).toBeTruthy();
    rm('-rf', publishDir, destDir);
  });

  test('copy assets from root to root, delete nothing', async () => {
    const publishDir = await createTestDir('src');
    const destDir = await createTestDir('dst');
    cp('-Rf', path.resolve(testRoot, 'fixtures/publish_dir_root'), publishDir);
    cp('-Rf', gitTempDir, destDir);
    cp('-Rf', gitTempDir, publishDir);

    await copyAssets(publishDir, destDir, '');
    expect(fs.existsSync(path.resolve(destDir, '.github'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'index.html'))).toBeTruthy();
    expect(fs.existsSync(path.resolve(destDir, 'assets/lib.css'))).toBeTruthy();
    rm('-rf', publishDir, destDir);
  });

  test.todo('copy assets from root to subdir, delete .github');
  test.todo('copy assets from root to subdir, delete .github,main.js');
  test.todo('copy assets from root to subdir, delete nothing');
});

describe('setRepo()', () => {
  test('throw error destination_dir should be a relative path', async () => {
    process.env['INPUT_GITHUB_TOKEN'] = 'test_github_token';
    process.env['INPUT_PUBLISH_BRANCH'] = 'gh-pages';
    process.env['INPUT_PUBLISH_DIR'] = 'public';
    process.env['INPUT_DESTINATION_DIR'] = '/subdir';
    process.env['INPUT_EXCLUDE_ASSETS'] = '.github';
    const inps: Inputs = getInputs();
    const remoteURL = 'https://x-access-token:pat@github.com/actions/pages.git';
    const date = new Date();
    const unixTime = date.getTime();
    const workDir = await getWorkDirName(`${unixTime}`);
    await expect(setRepo(inps, remoteURL, workDir)).rejects.toThrow(
      'destination_dir should be a relative path'
    );
  });

  test('preserve sibling directories for force_orphan deployments to destination_dir', async () => {
    const workspace = await createTestDir('workspace');
    const publishDir = path.join(workspace, 'public');
    const remoteRepo = await createTestDir('remote');
    const workDir = await createTestDir('work');

    process.env['GITHUB_WORKSPACE'] = workspace;
    try {
      await createDir(workspace);
      await createDir(publishDir);
      await createDir(remoteRepo);

      writeFixtureFile(path.join(publishDir, 'index.html'), 'new index');
      writeFixtureFile(path.join(publishDir, 'assets/app.js'), 'console.log("new");');

      process.chdir(remoteRepo);
      await exec.exec('git', ['init']);
      await exec.exec('git', ['config', 'user.name', 'octocat']);
      await exec.exec('git', ['config', 'user.email', 'octocat@github.com']);

      writeFixtureFile(path.join(remoteRepo, 'shared/keep.txt'), 'keep me');
      writeFixtureFile(path.join(remoteRepo, 'docs/old.html'), 'old page');
      writeFixtureFile(path.join(remoteRepo, 'docs/assets/old.js'), 'old asset');

      await exec.exec('git', ['add', '--all']);
      await exec.exec('git', ['commit', '-m', 'seed gh-pages']);
      await exec.exec('git', ['branch', '-M', 'gh-pages']);

      const inps: Inputs = {
        DeployKey: '',
        GithubToken: '',
        PublishBranch: 'gh-pages',
        PublishDir: 'public',
        DestinationDir: 'docs',
        ExternalRepository: '',
        AllowEmptyCommit: false,
        KeepFiles: false,
        ForceOrphan: true,
        CommitMessage: '',
        FullCommitMessage: '',
        TagName: '',
        TagMessage: '',
        DisableNoJekyll: false,
        CNAME: '',
        ExcludeAssets: '.github'
      };

      await setRepo(inps, remoteRepo, workDir);

      expect(fs.existsSync(path.join(workDir, 'shared/keep.txt'))).toBeTruthy();
      expect(fs.existsSync(path.join(workDir, 'docs/index.html'))).toBeTruthy();
      expect(fs.existsSync(path.join(workDir, 'docs/assets/app.js'))).toBeTruthy();
      expect(fs.existsSync(path.join(workDir, 'docs/old.html'))).toBeFalsy();
      expect(fs.existsSync(path.join(workDir, 'docs/assets/old.js'))).toBeFalsy();

      const result = await exec.exec('git', ['rev-parse', '--verify', 'HEAD'], {
        cwd: workDir,
        ignoreReturnCode: true
      });
      expect(result).toBe(128);
    } finally {
      rm('-rf', workspace, remoteRepo, workDir);
      delete process.env['GITHUB_WORKSPACE'];
    }
  });
});

describe('configureCommitter()', () => {
  let workDirName = '';
  (async (): Promise<void> => {
    const date = new Date();
    const unixTime = date.getTime();
    workDirName = await getWorkDirName(`${unixTime}`);
  })();

  beforeEach(async () => {
    await createDir(workDirName);
    process.chdir(workDirName);
    await exec.exec('git', ['init']);
  });

  test('set GitHub Actions bot committer identity', async () => {
    const result: CmdResult = {
      exitcode: 0,
      output: ''
    };
    const options = {
      listeners: {
        stdout: (data: Buffer): void => {
          result.output += data.toString();
        }
      }
    };
    await configureCommitter();
    result.exitcode = await exec.exec('git', ['config', 'user.name'], options);
    expect(result.output).toMatch('github-actions[bot]');
    result.exitcode = await exec.exec('git', ['config', 'user.email'], options);
    expect(result.output).toMatch('41898282+github-actions[bot]@users.noreply.github.com');
  });
});

describe('getCommitMessage()', () => {
  test('get default message', () => {
    const test = getCommitMessage('', '', '', 'actions/pages', 'commit_hash');
    expect(test).toMatch('deploy: commit_hash');
  });

  test('get default message for external repository', () => {
    const test = getCommitMessage(
      '',
      '',
      'actions/actions.github.io',
      'actions/pages',
      'commit_hash'
    );
    expect(test).toMatch('deploy: actions/pages@commit_hash');
  });

  test('get custom message', () => {
    const test = getCommitMessage('Custom msg', '', '', 'actions/pages', 'commit_hash');
    expect(test).toMatch('Custom msg commit_hash');
  });

  test('get custom message for external repository', () => {
    const test = getCommitMessage(
      'Custom msg',
      '',
      'actions/actions.github.io',
      'actions/pages',
      'commit_hash'
    );
    expect(test).toMatch('Custom msg actions/pages@commit_hash');
  });

  test('get full custom message', () => {
    const test = getCommitMessage('', 'Full custom msg', '', 'actions/pages', 'commit_hash');
    expect(test).toMatch('Full custom msg');
  });

  test('get full custom message for external repository', () => {
    const test = getCommitMessage(
      '',
      'Full custom msg',
      'actions/actions.github.io',
      'actions/pages',
      'commit_hash'
    );
    expect(test).toMatch('Full custom msg');
  });
});
