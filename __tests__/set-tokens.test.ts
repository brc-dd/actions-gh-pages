import * as github from '@actions/github';
import {Inputs} from '../src/interfaces';
import {getPublishRepo, setGithubToken, setTokens} from '../src/set-tokens';

beforeEach(() => {
  jest.resetModules();
  process.env.GITHUB_REPOSITORY = 'owner/repo';
  github.context.ref = 'refs/heads/master';
  github.context.eventName = 'push';
});

afterEach(() => {
  delete process.env.GITHUB_REPOSITORY;
});

describe('getPublishRepo()', () => {
  test('return repository name', () => {
    const test = getPublishRepo('', 'owner', 'repo');
    expect(test).toMatch('owner/repo');
  });

  test('return external repository name', () => {
    const test = getPublishRepo('extOwner/extRepo', 'owner', 'repo');
    expect(test).toMatch('extOwner/extRepo');
  });
});

describe('setGithubToken()', () => {
  test('return remote url with GITHUB_TOKEN gh-pages', () => {
    const expected = 'https://x-access-token:GITHUB_TOKEN@github.com/owner/repo.git';
    const test = setGithubToken(
      'GITHUB_TOKEN',
      'owner/repo',
      'gh-pages',
      'refs/heads/master',
      'push'
    );
    expect(test).toMatch(expected);
  });

  test('return remote url with GITHUB_TOKEN master', () => {
    const expected = 'https://x-access-token:GITHUB_TOKEN@github.com/owner/repo.git';
    const test = setGithubToken(
      'GITHUB_TOKEN',
      'owner/repo',
      'master',
      'refs/heads/source',
      'push'
    );
    expect(test).toMatch(expected);
  });

  test('return remote url with GITHUB_TOKEN gh-pages (RegExp)', () => {
    const expected = 'https://x-access-token:GITHUB_TOKEN@github.com/owner/repo.git';
    const test = setGithubToken(
      'GITHUB_TOKEN',
      'owner/repo',
      'gh-pages',
      'refs/heads/gh-pages-base',
      'push'
    );
    expect(test).toMatch(expected);
  });

  test('throw error gh-pages-base to gh-pages-base (RegExp)', () => {
    expect(() => {
      setGithubToken(
        'GITHUB_TOKEN',
        'owner/repo',
        'gh-pages-base',
        'refs/heads/gh-pages-base',
        'push'
      );
    }).toThrow('You deploy from gh-pages-base to gh-pages-base');
  });

  test('throw error master to master', () => {
    expect(() => {
      setGithubToken('GITHUB_TOKEN', 'owner/repo', 'master', 'refs/heads/master', 'push');
    }).toThrow('You deploy from master to master');
  });

  test('return remote url for external repository', () => {
    const expected = 'https://x-access-token:GITHUB_TOKEN@github.com/extOwner/extRepo.git';
    const test = setGithubToken(
      'GITHUB_TOKEN',
      'extOwner/extRepo',
      'gh-pages',
      'refs/heads/master',
      'push'
    );
    expect(test).toMatch(expected);
  });

  test('return remote url with GITHUB_TOKEN pull_request', () => {
    const expected = 'https://x-access-token:GITHUB_TOKEN@github.com/owner/repo.git';
    const test = setGithubToken(
      'GITHUB_TOKEN',
      'owner/repo',
      'gh-pages',
      'refs/pull/29/merge',
      'pull_request'
    );
    expect(test).toMatch(expected);
  });
});

describe('setTokens()', () => {
  test('return remote url with github_token for external repository', async () => {
    const inps: Inputs = {
      DeployKey: '',
      GithubToken: 'pat',
      PublishBranch: 'gh-pages',
      PublishDir: 'public',
      DestinationDir: '',
      ExternalRepository: 'extOwner/extRepo',
      AllowEmptyCommit: false,
      KeepFiles: false,
      ForceOrphan: false,
      CommitMessage: '',
      FullCommitMessage: '',
      TagName: '',
      TagMessage: '',
      DisableNoJekyll: false,
      CNAME: '',
      ExcludeAssets: '.github'
    };

    await expect(setTokens(inps)).resolves.toMatch(
      'https://x-access-token:pat@github.com/extOwner/extRepo.git'
    );
  });
});
