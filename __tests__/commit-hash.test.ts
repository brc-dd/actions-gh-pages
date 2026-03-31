import {getCommitHash} from '../src/git-utils';

describe('getCommitHash()', () => {
  test('use workflow sha for push events', () => {
    const test = getCommitHash('push', {}, 'workflow_sha');
    expect(test).toMatch('workflow_sha');
  });

  test('use pull request head sha for pull_request events', () => {
    const test = getCommitHash(
      'pull_request',
      {
        pull_request: {
          head: {
            sha: 'pr_head_sha'
          }
        }
      },
      'merge_sha'
    );
    expect(test).toMatch('pr_head_sha');
  });

  test('fall back to workflow sha when pull request head sha is missing', () => {
    const test = getCommitHash(
      'pull_request',
      {
        pull_request: {
          head: {}
        }
      },
      'merge_sha'
    );
    expect(test).toMatch('merge_sha');
  });
});
