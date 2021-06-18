# mackerel-create-release-pull-request-action

<a href="https://github.com/mackerelio/mackerel-create-release-pull-request-action/actions"><img alt="status" src="https://github.com/mackerelio/mackerel-create-release-pull-request-action/workflows/build-test/badge.svg"></a>

This repository is used for this organization's release flow and is subject to change without notice.

## Development

Install the dependencies

```bash
npm install
```

Run the tests :heavy_check_mark:

```bash
$ npm test
...
```

## Usage

```yaml
on:
  workflow_dispatch:
    inputs:
      release_version:
        description: 'next release version'
        required: true

env:
  GIT_AUTHOR_NAME: ...
  GIT_AUTHOR_EMAIL: ...
  GIT_COMMITTER_NAME: ...
  GIT_COMMITTER_EMAIL: ...

uses: mackerelio/mackerel-create-release-pull-request-action@main
id: start
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  next_version: ${{ github.event.inputs.release_version }}
  package_name: mkr

# You can put any steps between **mackerel-create-release-pull-request-action**s.

run: |
  CURRENT=${{ steps.start.outputs.currentVersion }}
  NEXT=${{ steps.start.outputs.nextVersion }}
  mv packaging/mkr_$CURRENT.orig.tar.gz packaging/mkr_$NEXT.orig.tar.gz

uses: mackerelio/mackerel-create-release-pull-request-action@main
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  finished: "true"
  package_name: mkr
  next_version: ${{ steps.start.outputs.nextVersion }}
  branch_name: ${{ steps.start.outputs.branchName }}
  pull_request_infos: ${{ steps.start.outputs.pullRequestInfos }}
env:
  RUNNER_DEBUG: 1
```

