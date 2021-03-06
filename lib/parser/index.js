const sketch2json = require('sketch2json');
const Figma = require('figma-js');
const path = require('path');

const { findAllTokens, flattenChildren, retrieveImageUrls } = require('../figma');
const { isSketch, isAdobeXD } = require('../utils');
const {
  getPageArrays,
  getColorsFromArtboard,
  getGradientsFromArtboard,
  getShadowsFromArtboard,
  getBordersFromArtboard,
  getBlursFromArtboard,
} = require('../../lib/sketch');
const getAdobeXDContents = require('../adobexd');
const { readFile, uniqueArray } = require('../utils');
const { FILE_TYPES } = require('./constants');

const parseTokens = async (args, flags) => {
  const [file] = args;

  if (isSketch(file)) {
    try {
      const response = await sketch2json(await readFile(file));
      const primitivesPage = getPageArrays(response).find(
        i => i.name.toLowerCase() === 'primitives',
      );
      if (!primitivesPage) {
        throw new Error(`
          No primitives page found, skipping exporting of tokens.
          Please see https://github.com/inthepocket/hubble-sketch-plugin/wiki/Artboard-formatting#primitives-page on how to structure your Sketch file.
        `);
      }

      return {
        colors: flags.useColorArtboards
          ? getColorsFromArtboard(primitivesPage.layers)
          : response.document.assets.colorAssets.map(({ color, _class, name }) => ({
              ...color,
              _class,
              name,
            })),
        gradients: flags.useGradientArtboards
          ? getGradientsFromArtboard(primitivesPage.layers)
          : response.document.assets.gradientAssets.map(({ gradient, _class }) => ({
              ...gradient,
              _class,
            })),
        textStyles: response.document.layerTextStyles.objects,
        shadows: getShadowsFromArtboard(primitivesPage.layers),
        borders: getBordersFromArtboard(primitivesPage.layers),
        blurs: getBlursFromArtboard(primitivesPage.layers),
        fonts: response.meta.fonts,
        get grid() {
          const [grid] = primitivesPage.layers.map(layer => layer.grid);
          return (grid && Number(grid.gridSize)) ? { size: grid.gridSize } : null;
        },
        assets: null,
        version: response.meta.appVersion, // Sketch Application Version
        fileType: FILE_TYPES.SKETCH,
        response,
      };
    } catch (err) {
      throw new Error(err);
    }
  } else if (isAdobeXD(file)) {
    try {
      const { outputDir } = flags;
      const adobeXDContents = await getAdobeXDContents(file, path.join(outputDir, 'temp'));

      return {
        ...adobeXDContents,
        fileType: FILE_TYPES.ADOBEXD,
        response: adobeXDContents,
      };
    } catch (err) {
      throw new Error(err);
    }
  } else {
    try {
      const { token, exportAssets } = flags;
      if (!token) throw new Error('Please add a Figma API authorization token');

      const client = Figma.Client({ personalAccessToken: token });
      const { data } = await client.file(file);

      const primitivesPage = data.document.children.find(i => i.name.toLowerCase() === 'primitives');

      if (!primitivesPage) {
        throw new Error(`
          No primitives page found, skipping exporting of tokens.
          Please see https://github.com/inthepocket/hubble-sketch-plugin/wiki/Artboard-formatting#primitives-page on how to structure your Figma file.
        `);
      }

      const response = flattenChildren(data.document);

      let assets = null;
      if (exportAssets) {
        assets = await retrieveImageUrls(client, file, response);
      }

      return {
        colors: findAllTokens(response, 'color'),
        textStyles: findAllTokens(response, 'textstyle'),
        fonts: uniqueArray(
          findAllTokens(response, 'text')
            .map(text => {
              const hasFontToken = text && Array.isArray(text.children) && text.children[0].style;
              if (hasFontToken) {
                return text.children[0].style.fontPostScriptName;
              }
              return text;
            })
        ),
        gradients: findAllTokens(response, 'gradient'),
        shadows: findAllTokens(response, 'shadow'),
        borders: findAllTokens(response, 'border'),
        blurs: findAllTokens(response, 'blur'),
        get grid() {
          const [gridArtboard] = findAllTokens(response, 'grid');
          if (!gridArtboard) {
            return null;
          }

          const grid = gridArtboard.layoutGrids.find(layout => layout.pattern === 'GRID');
          return (grid && Number(grid.sectionSize)) ? { size: grid.sectionSize } : null;
        },
        assets,
        version: 'v1', // Figma API Version
        fileType: FILE_TYPES.FIGMA,
        response: data,
      };
    } catch (err) {
      if (err.response) {
        const httpCode = err.response.status;
        if (httpCode === 404) {
          throw new Error(`The Figma file was not found. Double check if the provided id "${file}" is correct and the file exists.`)
        } else if (httpCode === 403) {
          throw new Error(`Invalid Figma token. Double check if the provided token is correct, and you have access rights to the file.`);
        }
      }

      throw err;
    }
  }
};

module.exports = (args, flags) => ({
  parser: {
    getTokens: () => parseTokens(args, flags),
  },
});
