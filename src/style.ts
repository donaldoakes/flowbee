import './css/style.scss';
import { merge } from 'merge-anything';

export class DiagramStyle {

    constructor(theme: string) {

        const obj = {};

        for (let i = 0; i < document.styleSheets.length; i++) {
            const styleSheet = document.styleSheets[i];
            for (let j = 0; j < styleSheet.cssRules.length; j++) {
                const cssRule = styleSheet.cssRules[j];
                const selectorText = (cssRule as any).selectorText;
                if (selectorText) {

                    if (selectorText === '.flowbee-diagram' || selectorText.startsWith('.flowbee-diagram ')
                      || selectorText === `.flowbee-diagram-${theme}` || selectorText.startsWith(`.flowbee-diagram-${theme} `)) {
                        //
                        const selTextObj = {};
                        const style = (cssRule as any).style;
                        if (style) {
                            let selTextName = selectorText.substring(1);
                            if (selTextName === `flowbee-diagram-${theme}`) {
                                selTextName = 'flowbee-diagram';
                            } else if (selTextName.startsWith(`flowbee-diagram-${theme} `)) {
                                const startLen = `flowbee-diagram-${theme}`.length;
                                selTextName = `flowbee-diagram ${selTextName.substring(startLen + 1)}`;
                            }

                            for (let k = 0; k < style.length; k++) {
                                const key = style[k];
                                const val = style.getPropertyValue(key);
                                if (val) {
                                    selTextObj[key] = val;
                                }
                            }

                            const prevSelTextObj = obj[selTextName];
                            obj[selTextName] = merge(prevSelTextObj || {}, selTextObj);
                        }
                    }
                }
            }
        }

        console.log("OBJ: " + JSON.stringify(obj, null, 2));



        // const allCSS = [...styleSheetList]
        // .map(styleSheet => {
        //   try {
        //     return [...styleSheet.cssRules]
        //       .map(rule => rule.cssText)
        //       .join('');
        //   } catch (e) {
        //     console.log('Access to stylesheet %s is denied. Ignoring...', styleSheet.href);
        //   }
        // })
        // .filter(Boolean)
        // .join('\n');

        // console.log("WHERE ARE MY STYLES?");
    }

}