# flowbee
**Simple, flexible, open flow diagramming.**

See [flowbee-demo](https://github.com/donaldoakes/flowbee-demo).

## Install
npm install --save flowbee

## Themes
Themeable styles are here:  
node_modules/flowbee/dist/style.css  

Built-in themes are 'light' and 'dark'.
You can override specific settings in these in your own css:
```
.flowbee-diagram-light .title {
  visibility: visible; /* show title in diagram */
}
```

Or you can create custom themes.
For example, custom diagram theme styles should follow this pattern:  
`flowbee-diagram-&lt;themename>`
By default your theme will extend flowbee-diagram-light styles.
To extend flowbee-diagram-dark styles, your theme name should end
with '-dark'.

Here's an ugly example:
```css
.flowbee-diagram-garish {
  color: darkblue;
  background-color: pink;
}

.flowbee-diagram-garish .grid {
  color: yellow;
  width: 44px;
}

.flowbee-diagram-garish.line {
  width: 5px;
}

.flowbee-diagram-garish .step .start {
  background-color: purple;
}
```

To utilize your theme pass its name to [FlowbeeDiagram.render()]():
```javascript
flowDiagram.render('garish', contents, filename);
```

## No Inline Styles
By default Flowbee uses inline styles via stylesheet injection. If you have a Content Security Policy 
and wish to avoid inline styles, you can point to the no-styles version of Flowbee:
```typescript
import * as flowbee from '../node_modules/flowbee/dist/nostyles.js';
```
Then you'd want to separately include Flowbee's css in your HTML:
```html
  <link href="flowbee/dist/css/style.css" rel="stylesheet" />
```


