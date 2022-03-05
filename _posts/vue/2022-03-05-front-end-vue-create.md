---
layout: post
title: 맥북 m1에서 VUE 프로젝트 생성하기
date: 2022-03-05
Author: Geon Son
categories: VUE
tags: [Vue, Front, Web]
comments: true
toc: true
---

코로나에 걸려서 일주일 넘게 고생했다. 감기라고 하던데 걸려보니 감기는 무슨...
회사 업무까지 하라고 해서 매일 감기약을 한통씩 먹어가면서 겨우 사람 몰골을 유지했다.(그렇게 진행한 업무는 구글 정책 변경으로 리젝 당했다... )
아직도 정상은 아니지만 그래도 공부하던 부분이 있으니 다시 포스팅을 해봤다.


# Vue 프로젝트 생성 준비 - 설치
프론트엔드를 전문적으로 하지는 않지만 그래도 나름 최신(?) 기술에 대해서 궁금했다. 무엇보다도 쉽다고 하니 프로젝트를 생성해보려고 했다.
먼저 npm으로 vue-cli를 설치 한다.

```
npm install -g@vue/cli
```
지금 기준(2022.03)으로 이렇게 명령어를 입력하면 Vue CLI v5.0.1 버전이 설치된다.
CLI 가 설치 되었다면 프로젝트를 생성한다. 프로젝트를 생성할때 매뉴얼 모드를 선택하여 설치하였다.
프로젝트는 별도로 설정을 하지 않으면 루트에 설치되는 듯 하다.


```
vue create front-end

Vue CLI v5.0.1
✨  Creating project in /Users/kada/front-end.
🗃  Initializing git repository...
⚙️  Installing CLI plugins. This might take a while...


added 1301 packages, and audited 1302 packages in 58s

111 packages are looking for funding
  run `npm fund` for details

7 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
🚀  Invoking generators...
📦  Installing additional dependencies...

npm ERR! code ETARGET
npm ERR! notarget No matching version found for chromedriver@99.
npm ERR! notarget In most cases you or one of your dependencies are requesting
npm ERR! notarget a package version that doesn't exist.

npm ERR! A complete log of this run can be found in:
npm ERR!     /Users/kada/.npm/_logs/2022-03-05T05_33_50_505Z-debug-0.log
 ERROR  Error: command failed: npm install --loglevel error --legacy-peer-deps
Error: command failed: npm install --loglevel error --legacy-peer-deps
    at ChildProcess.<anonymous> (/opt/homebrew/lib/node_modules/@vue/cli/lib/util/executeCommand.js:138:16)
    at ChildProcess.emit (node:events:526:28)
    at maybeClose (node:internal/child_process:1090:16)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:302:5)
```
명령어를 입력하면 이렇게 오류가 발생한다. 정확하게는 프로젝트는 생성되었지만 일부 라이브러리에서 오류가 발생한 것으로 추정한다.

추정하기로는 nvm 버전 node 버전 등 호환이 안되는 것으로 보인다. (애플 실리콘인 ARM 모드가 아니라 x64모드로 실행되어야 하는 것 같다.)
일단 오류가 발생한 프로젝트를 삭제하고 설치된 vue도 삭제한다.(버전을 바꿔 설치하기 위함)
vue 삭제한 이후에 설치된 버전을 확인한다. 당연히 버전이 나오지 않아야 정상이다.

```
sudo npm uninstall -g @vue/cli

removed 888 packages, and audited 1 package in 1s

found 0 vulnerabilities

kada@kadaui-MacBookAir ~ % vue --version
zsh: command not found: vue
```

# Vue 프로젝트 생성 준비 - 특정 버전 설치
```
sudo npm install -g @vue/cli@3.0.1

```
맥으로 설치시 가급적이면 sudo를 입력하고 설치한다. vue 설치시 @뒤에 원하는 버전을 입력한다.
지금 보고있는 책과 버전을 맞추기 위해 3.0.1 버전을 설치하였다.


## 로제타 설치

```
kada@kadaui-MacBookAir ~ % softwareupdate --install-rosetta
I have read and agree to the terms of the software license agreement. A list of Apple SLAs may be found here: http://www.apple.com/legal/sla/
Type A and press return to agree: agree
```
새로운 버전을 설치하더라도 같은 오류가 발생한다. 해결책을 찾아보다가 로제타로 실행하면 된다는 말을 찾았다.(x64 모드로 실행하기 위하여)
로제타를 설치하는 방법은 여러가지가 있는데 호환이 안되는 프로그램을 설치한 경험이 있다면 이미 설치되어 있을 것이다.
여기서는 터미널에 명령어를 입력하였다.

agree를 입력하면 설치가 된다.

## 로제타 터미널 사용 - node 14 설치

![](/images/vue/a44d6ef1-roseta2.png)
로제타 명령어를 터미널에서 사용하기 위해서는 기존의 터미널을 복사하고 command + i를 눌러 로제타 사용을 체크 해주면 된다.
nvm은 설치 되어 있다고 가정하고 node 14 버전을 설치한다. (16버전은 로제타로 설치하지 않아도 되지만 위에서 언급한 것처럼 arm 으로 실행된다.)
```
kada@kadaui-MacBookAir ~ % nvm install 14
Downloading and installing node v14.19.0...
Downloading https://nodejs.org/dist/v14.19.0/node-v14.19.0-darwin-x64.tar.xz...
######################################################################### 100.0%
Computing checksum with shasum -a 256
Checksums matched!
Now using node v14.19.0 (npm v6.14.16)
Creating default alias: default -> 14 (-> v14.19.0)
```

다시 설치 vue 프로젝트를 설치하면 에러 메세지가 발생하기는 하지만 빌드는 진행되고
vue 프로젝트를 실행할수는 있게 된다..

```
Vue CLI v3.0.1
? Please pick a preset: default (babel, eslint)


Vue CLI v3.0.1
✨  Creating project in /Users/kada/front-end.
🗃  Initializing git repository...
⚙  Installing CLI plugins. This might take a while...


> fsevents@1.2.13 install /Users/kada/front-end/node_modules/watchpack-chokidar2/node_modules/fsevents
> node install.js

gyp ERR! configure error
gyp ERR! stack Error: EACCES: permission denied, mkdir '/Users/kada/front-end/node_modules/watchpack-chokidar2/node_modules/fsevents/build'
gyp ERR! System Darwin 21.3.0
gyp ERR! command "/Users/kada/.nvm/versions/node/v14.19.0/bin/node" "/Users/kada/.nvm/versions/node/v14.19.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "rebuild"
gyp ERR! cwd /Users/kada/front-end/node_modules/watchpack-chokidar2/node_modules/fsevents
gyp ERR! node -v v14.19.0
gyp ERR! node-gyp -v v5.1.0
gyp ERR! not ok

> fsevents@1.2.13 install /Users/kada/front-end/node_modules/webpack-dev-server/node_modules/fsevents
> node install.js

gyp ERR! configure error
gyp ERR! stack Error: EACCES: permission denied, mkdir '/Users/kada/front-end/node_modules/webpack-dev-server/node_modules/fsevents/build'
gyp ERR! System Darwin 21.3.0
gyp ERR! command "/Users/kada/.nvm/versions/node/v14.19.0/bin/node" "/Users/kada/.nvm/versions/node/v14.19.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "rebuild"
gyp ERR! cwd /Users/kada/front-end/node_modules/webpack-dev-server/node_modules/fsevents
gyp ERR! node -v v14.19.0
gyp ERR! node-gyp -v v5.1.0
gyp ERR! not ok

> yorkie@2.0.0 install /Users/kada/front-end/node_modules/yorkie
> node bin/install.js

setting up Git hooks
Error: EACCES: permission denied, open '/Users/kada/front-end/.git/hooks/applypatch-msg'
    at Object.openSync (fs.js:497:3)
    at Object.writeFileSync (fs.js:1528:35)
    at write (/Users/kada/front-end/node_modules/yorkie/src/install.js:18:6)
    at createHook (/Users/kada/front-end/node_modules/yorkie/src/install.js:45:5)
    at /Users/kada/front-end/node_modules/yorkie/src/install.js:86:21
    at Array.map (<anonymous>)
    at installFrom (/Users/kada/front-end/node_modules/yorkie/src/install.js:83:10)
    at Object.<anonymous> (/Users/kada/front-end/node_modules/yorkie/bin/install.js:24:1)
    at Module._compile (internal/modules/cjs/loader.js:1085:14)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1114:10) {
  errno: -13,
  syscall: 'open',
  code: 'EACCES',
  path: '/Users/kada/front-end/.git/hooks/applypatch-msg'
}

> core-js@2.6.12 postinstall /Users/kada/front-end/node_modules/core-js
> node -e "try{require('./postinstall')}catch(e){}"


> ejs@2.7.4 postinstall /Users/kada/front-end/node_modules/ejs
> node ./postinstall.js

added 1302 packages from 685 contributors in 32.069s

82 packages are looking for funding
  run `npm fund` for details

🚀  Invoking generators...
📦  Installing additional dependencies...

added 38 packages from 30 contributors, updated 2 packages and moved 9 packages in 8.935s

83 packages are looking for funding
  run `npm fund` for details

⚓  Running completion hooks...

📄  Generating README.md...

🎉  Successfully created project front-end.
👉  Get started with the following commands:

 $ cd front-end
 $ npm run serve
```

## 남아있는 문제
원래 내가 보고있는 책에서는 매뉴얼모드로 프로젝트를 생성하였다.
하지만 매뉴얼모드로 실행시 chromedriver error가 발생하였다.
어쩔수 없이 디폴트  모드로 실행 시켰는데 이게 무슨 에러를 발생 시킬지는
나중에 확인해 봐야 겠다..
