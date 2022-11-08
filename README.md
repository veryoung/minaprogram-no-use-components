# minaprogram-no-use-components
一个用在原生小程序上的脚本

### 主要功能
根据微信提示的优化项:

组件/页面的usingComponents会影响启动速度，应避免将多余的组件声明usingComponents中

需要删除在usingComponents注册了，但没有真实在wxml真实使用的组件

### 使用方式

1. 更改脚本所在真实目录

项目根目录
```
const rootDir = '../'
```

2. 使用node运行脚本

```
cross-env NODE_ENV=development BUILD_TYPE=develop  node script/deletNoUseComponents
```

其中

```
BUILD_TYPE === develop
```
会开启json文件的自动替换 否则只有提示功能

