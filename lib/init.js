const path = require('path')
const fs = require('fs')
const ora = require('ora')
const glob = require('glob');
const config = require('./config')
const { mixReplace } = require('./util')

// 默认为element-ui主题路径
const defaultThemePath = path.resolve(process.cwd(), 'node_modules', config.themeName)

const checkPath = function (p) {
  if (!fs.existsSync(p)) {
    ora('please install `' + p + '`').fail()
    process.exit(1)
  }
}

const getInjectScss = function () {
  return fs.readFileSync(path.resolve(__dirname,'./inject.scss')).toString() +  '\r\n';
}

const injectStr = getInjectScss()

const init = async function (options = {}) {
  const { targetThemePathRoot, themeDir, themeVarName, themeVarPath } = options
  let tvp = themeVarPath || config.eleVarPath
  const varScssPath = path.resolve(process.cwd(), config.eleThemeDir, '../element-variables.scss')
  // 检查路径是否存在
  checkPath(varScssPath)
  // 将element-variables.scss文件移动到主题路径的val
  fs.copyFileSync(varScssPath,path.resolve(process.cwd(), targetThemePathRoot || defaultThemePath, tvp))
  checkPath(targetThemePathRoot || defaultThemePath)
  var spinner = ora().start()
  let themePath =  themeDir || defaultThemePath
  const scssFiles = await glob('**/*.scss', {
    sync: true,
    cwd: themePath
  })
  scssFiles.forEach(v => {
    let filePath = ''
    if (v == tvp) {
      filePath = varScssPath
      if (fs.existsSync(filePath)) {
        spinner.text = `${themeVarName || config.config} 文件已经生成，如果需要新生成文件，请注意备份老文件，然后已生成的老文件！`
        spinner.fail()
        return
      }
    }
    let successTxt = v;
      const varsPath = path.resolve(`${themePath}/${v}`)
      let varStr = fs.readFileSync(varsPath)
      varStr = mixReplace(varStr.toString(), v)
      // 此处是为了注入写好的 mixToVar 代码在scss变量入口文件中
      if (v == tvp) {
        if (!varStr.includes('function mixToVar')) {
          varStr = injectStr + varStr
        }
        successTxt = config.config
      }
      fs.writeFileSync(filePath || varsPath, varStr, 'utf-8')
      spinner.text = `${successTxt} 生成成功.`
      spinner.succeed()
  })
}

module.exports = {
  themeInit: init
}


