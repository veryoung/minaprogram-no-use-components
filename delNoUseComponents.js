/* eslint-disable no-use-before-define */

const fs = require('fs')
const path = require('path')
const env = process.env.BUILD_TYPE
const replaceExt = require('replace-ext')

/** 项目根目录 */
const rootDir = '../'

// 小程序注册入口文件
const entry = require(`${rootDir}/src/app.json`)

/** 没用使用到tags文件计数 */
let noUseTagsNumsPages = 0

/** 文件映射 */
const noUseTagPagesMap = {}

/** 是否打log */
const showLog = true

/** 是否自动删除 */
const isAutoDelete = env === 'develop'

/** 小程序页面全路径 */
const entries = []

const currentDirname = path.resolve(__dirname, '../src')

/** 动态的遍历入口文件下所有子引用 */
function _inflateEntries(entries = [], dirname, entry) {
  const configFile = replaceExt(entry, '.json')
  const content = fs.readFileSync(configFile, 'utf8')
  const config = JSON.parse(content)

  const { pages, usingComponents, subPackages } = config
  pages && pages.forEach((item) => inflateEntries(entries, dirname, item))
  usingComponents && Object.values(usingComponents).forEach((item) => inflateEntries(entries, dirname, item))
  subPackages &&
    subPackages.forEach((subpackage) => {
      if (!subpackage.pages) {
        return
      }
      return subpackage.pages.forEach((item) => inflateEntries(entries, dirname + `/${subpackage.root}`, item))
    })
}

function inflateEntries(entries, dirname, entry) {
  if (/plugin:\/\//.test(entry)) {
    console.log(`发现插件 ${entry}`)
    return
  }

  if (typeof entry !== 'string') {
    throw new Error('入口文件位置获取有误')
  }

  entry = path.resolve(dirname, entry)
  if (entry != null && !entries.includes(entry)) {
    entries.push(entry)
    _inflateEntries(entries, path.dirname(entry), entry)
  }
}

Object.keys(entry).forEach((i) => {
  if (i === 'pages') {
    entry[i] &&
      entry[i].length > 0 &&
      entry[i].forEach((j) => {
        inflateEntries(entries, currentDirname, j)
      })
  }
  if (i === 'subPackages') {
    entry[i].forEach((j) => {
      if (j && j.pages && j.pages.length > 0) {
        j.pages.forEach((k) => {
          inflateEntries(entries, currentDirname, `${j.root}/${k}`)
        })
      }
    })
  }
})


/**
 * 查找当前页面内未使用的组件并记录
 * @param {*} i 页面地址
 * @param {*} json 注册组件的json
 * @param {*} wxml 页面对应的xml
 */
const findNoUseComponents = (i, json, wxml) => {
  const currentJSONComponents = []
  const noUseTags = []
  if (json.usingComponents) {
    Object.keys(json.usingComponents).forEach((i) => {
      currentJSONComponents.push(i)
    })
  } else {
    console.log('there is no use components', i, json)
  }

  if (currentJSONComponents.length > 0) {
    currentJSONComponents.forEach((i) => {
      const tagsName = `<${i}`
      if (wxml.indexOf(tagsName) < 0) {
        noUseTags.push(i)
      }
    })
  }
  if (noUseTags.length > 0) {
    noUseTagsNumsPages += 1
    noUseTagPagesMap[i] = noUseTags
  }
}

entries.forEach((i) => {
  const jsonFile = path.resolve(`${i}.json`)
  const xmlFile = path.resolve(`${i}.wxml`)
  const jsonContent = fs.readFileSync(jsonFile, 'utf8')
  const wxmlInfo = fs.readFileSync(xmlFile, 'utf8')
  const jsonInfo = JSON.parse(jsonContent, 'utf8')
  findNoUseComponents(i, jsonInfo, wxmlInfo)
})

console.log('\x1B[31m%s\x1B[0m', `总共有${noUseTagsNumsPages}个页面引用了tag却没有使用,考虑删除他们好吗?`)

if (showLog) {
  console.log('未使用引用组件映射 /n', noUseTagPagesMap)
}

if (isAutoDelete) {
  Object.keys(noUseTagPagesMap).forEach((i) => {
    const filePath = path.resolve(`${i}.json`)
    const fileContent = fs.readFileSync(filePath)
    const json = JSON.parse(fileContent, 'utf8')
    const { usingComponents } = json
    const noUseTagArr = noUseTagPagesMap[i]
    Object.keys(usingComponents).forEach((j) => {
      if (noUseTagArr.includes(j)) {
        delete usingComponents[j]
      }
    })
    const jsonContent = JSON.stringify(json)
    fs.writeFile(filePath, jsonContent, 'utf8', function (err) {
      if (err) {
        console.log('An error occured while writing JSON Object to File.')
        return console.log(err)
      }
      console.log('JSON file has been saved.')
    })
  })
}
