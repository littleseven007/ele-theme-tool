const path = require("path");
const fs = require("fs");
const glob = require("glob");
const config = require("./config");
const { varReplace } = require("./util");

const setVarColor = async function (options = {}) {
  const { varConfig = { "--customize-theme": "#409EFF" }, themeDir } = options;
  const dir = path.resolve(process.cwd(), themeDir || config.eleThemeDir);
  const cssFiles = await glob("*.css", {
    sync: true,
    cwd: dir,
  });
  const cssTempVariables = [];
  cssFiles.forEach((item) => {
    const cssItem = fs.readFileSync(path.resolve(dir, item)).toString();
    const newStr = varReplace(cssItem, varConfig, cssTempVariables);
    fs.writeFileSync(path.resolve(dir, item), newStr, "utf-8");
  });
  createWebJs(cssTempVariables);
};

const createWebJs = function (cssTempVariables) {
  const scssTempVariables = getKeysInElementVariables();
  const keyMap = [...cssTempVariables, ...scssTempVariables];
  // 修改：直接修改算法从element-variables.scss中读取
  const keys = [...new Set(keyMap)].sort();
  let injectWebJsPath = path.resolve(__dirname, "./injectWeb.js");
  let webJsPath = path.resolve(process.cwd(), config.eleThemeDir, "theme-tool-web.js");
  const webJs = fs.readFileSync(injectWebJsPath).toString();
  const noCheck = `// @ts-nocheck
/* eslint-disable */`
  const codeStr = `${noCheck}
const keys = ${JSON.stringify(keys)}` + "\r\n" + webJs;
  fs.writeFileSync(webJsPath, codeStr, "utf-8");
};

// 充scss变量文件中获取变量key
const getKeysInElementVariables = function () {
  const varScssPath = path.resolve(process.cwd(), config.eleThemeDir, '../element-variables.scss')
  const scssItem = fs
    .readFileSync(varScssPath)
    .toString();
  const reg = /mixToVar\((.*?)\)/g;
  const matches = scssItem.match(reg);
  const valueMap = {};
  const result = [];
  matches.forEach((match) => {
    const argValuesStr = match.replace("mixToVar(", "").replace(")", "");
    const argValueArr = argValuesStr
      .split(",")
      .map((argValue) => argValue.trim());
    if (argValueArr.length !== 3) return;
    // 第二个参数是百分比数字才处理
    const percentRef = /^[\d]+\%$/;
    if (!percentRef.test(argValueArr[2])) return;
    const mixArr = ["", "", argValueArr[2].slice(0, -1)];
    let hasCustomVar = false;
    argValueArr.slice(0, 2).forEach((argValue, index) => {
      const key = argValue;
      if (valueMap[argValue]) {
        if (valueMap[argValue].type === "color") {
          mixArr[index] = "--YS" + valueMap[argValue].color;
        } else {
          mixArr[index] = valueMap[argValue].color;
          hasCustomVar = true;
        }
      } else {
        // 去文件中匹配颜色色值
        // 普通色值 只支持#xxxxxx格式
        const findColorReg = new RegExp(
          `${argValue
            .replace(/-/g, "\\-")
            .replace("$", "\\$")}\\:\\s#(\[\\da-zA-Z\]{6})\\s`
        );
        // 自定义变量var颜色
        const findCustomReg = new RegExp(
          `${argValue
            .replace(/-/g, "\\-")
            .replace("$", "\\$")}\\:\\svar\\(([\\w\-\]{1,})\\)\\s`
        );
        const findColor = scssItem.match(findColorReg);
        const findCustomColor = scssItem.match(findCustomReg);
        // console.log(findColor,findCustomColor)
        if (findColor) {
          const color = findColor[1];
          mixArr[index] = "--YS" + color;
          valueMap[key] = { color: color, type: "color" };
        } else if (findCustomColor) {
          const customColor = findCustomColor[1];
          mixArr[index] = customColor;
          valueMap[key] = { color: customColor, type: "var" };
          hasCustomVar = true;
        }
      }
    });
    // '--YSffffff_--customize-theme_92'
    if (hasCustomVar) {
      result.push(mixArr.join("_"));
    }
  });
  return result;
};

module.exports = {
  setDefaultVarColor: setVarColor,
};
