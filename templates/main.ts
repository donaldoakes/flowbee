import * as flowbee from 'flowbee/dist/nostyles';
import * as jsYaml from 'js-yaml';
import { Options } from './options';
import { Templates } from './templates';
import { FlowSplitter, ToolboxSplitter } from './splitter';
import {
    DrawingTools,
    OptionToggleEvent,
    FlowActions,
    FlowActionEvent,
    ZoomChangeEvent
} from './actions';
import { descriptors } from './descriptors';
import { MenuProvider } from './menu';
import { Input, FlowInput } from './input';
import { safeEval } from './eval';

// @ts-ignore
const vscode = acquireVsCodeApi();
const EOL = navigator.platform.indexOf('Win') > -1 ? '\r\n' : '\n';

let templates: Templates;
let flowInput: FlowInput = {};
let teams: string[] = [];

interface Confirmation {
    result: boolean;
}
const dlgEvt = new flowbee.TypedEvent<Confirmation>();

class DialogProvider implements flowbee.DialogProvider {
    alert(message: flowbee.DialogMessage) {
        vscode.postMessage({ type: 'alert', message });
    }
    async confirm(message: flowbee.DialogMessage): Promise<boolean> {
        const promise = new Promise<boolean>((resolve) => {
            dlgEvt.once((e) => {
                resolve(e.result);
            });
        });
        vscode.postMessage({ type: 'confirm', message });
        return promise;
    }
}

let oldFlow: flowbee.Disposable;

interface Config {
    webSocketUrl: string;
    showSourceTab: boolean;
    apiToken?: string;
}

let customDescriptors: flowbee.Descriptor[] = [];

export class Flow implements flowbee.Disposable {
    readonly options: Options;
    readonly flowDiagram: flowbee.FlowDiagram;
    readonly flowActions?: FlowActions;
    private readonly drawingTools?: DrawingTools;
    private readonly toolbox?: flowbee.Toolbox;
    private readonly toolboxContainer?: HTMLDivElement;
    private readonly toolboxCaret?: HTMLSpanElement;
    private customToolbox?: flowbee.Toolbox;
    private disposables: flowbee.Disposable[] = [];
    static configurator?: flowbee.Configurator;

    /**
     * @param readonly file is readonly
     */
    constructor(
        private base: string,
        readonly config: Config,
        text: string,
        private file: string,
        private readonly: boolean
    ) {
        oldFlow?.dispose();
        oldFlow = this;
        this.options = new Options(base, config.webSocketUrl);
        this.options.theme = document.body.className.endsWith('vscode-dark') ? 'dark' : 'light';

        // configurator
        if (!Flow.configurator) {
            Flow.configurator = new flowbee.Configurator(
                document.getElementById('flow-diagram') as HTMLElement
            );
        }
        this.disposables.push(
            Flow.configurator.onFlowElementUpdate(async (e) => {
                if (typeof e.action === 'string') {
                    if (
                        e.action === 'Create File' ||
                        e.action === 'Select File' ||
                        e.action === 'Select Subflow'
                    ) {
                        if (e.action === 'Create File') {
                            vscode.postMessage({
                                type: 'new',
                                element: 'file',
                                target: e.element.id
                            });
                        } else if (e.action === 'Select File') {
                            vscode.postMessage({
                                type: 'select',
                                element: 'file',
                                target: e.element.id
                            });
                        } else if (e.action === 'Select Subflow') {
                            vscode.postMessage({
                                type: 'select',
                                element: 'flow',
                                target: e.element.id,
                                attr: { name: 'subflow' }
                            });
                        }
                    } else if (e.action?.endsWith('.ts')) {
                        vscode.postMessage({ type: 'edit', element: 'file', path: e.action });
                    } else if (e.action?.endsWith('.flow.yaml')) {
                        vscode.postMessage({
                            type: 'open',
                            element: 'flow',
                            path: e.action
                        });
                    } else if (e.element.type === 'flow') {
                        // parent flow instance
                        vscode.postMessage({
                            type: 'open',
                            element: 'flow',
                            instanceId: e.action
                        });
                    }
                } else if (typeof e.action === 'object') {
                    if (e.element.type === 'link') {
                        const disp = flowbee.LinkLayout.fromAttr(e.element.attributes?.display);
                        const from = this.flowDiagram.flow.steps?.find((s) =>
                            s.links?.find((l) => l.id === e.element.id)
                        );
                        const to = this.flowDiagram.flow.steps?.find(
                            (s) => s.id === (e.element as any).to
                        );
                        // TODO from/to in subflow
                        if (from?.attributes?.display && to?.attributes?.display) {
                            const linkLayout = new flowbee.LinkLayout(
                                disp,
                                flowbee.parseDisplay(from)!,
                                flowbee.parseDisplay(to)!
                            );
                            let points: number | undefined;
                            if (e.action.name === 'shape' && typeof e.action.value === 'string') {
                                disp.type = e.action.value;
                            }
                            if (e.action.name === 'points' && typeof e.action.value === 'string') {
                                const pts = parseInt(e.action.value);
                                if (!isNaN(pts)) points = pts;
                            }
                            linkLayout.calcLink(points);
                            linkLayout.calcLabel();
                            e.element.attributes!.display = flowbee.LinkLayout.toAttr(disp);
                            await this.updateFlow();
                            this.flowDiagram.render(this.options.diagramOptions);
                        }
                    } else if (e.action.name.startsWith('subflowTemplate')) {
                        const type = e.action.name.endsWith('...') ? 'select' : 'open';
                        vscode.postMessage({
                            type,
                            element: 'flow',
                            ...(type === 'open' && { path: e.action.value[3] }),
                            target: e.element.id,
                            attr: {
                                name: 'services',
                                row: parseInt(e.action.value as string),
                                column: 3
                            }
                        });
                    } else if (e.action.name.startsWith('subflow')) {
                        const type = e.action.name.endsWith('...') ? 'select' : 'open';
                        vscode.postMessage({
                            type,
                            element: 'flow',
                            ...(type === 'open' && { path: e.action.value[1] }),
                            target: e.element.id,
                            attr: {
                                name: 'subflowActions',
                                row: parseInt(e.action.value as string),
                                column: 1
                            }
                        });
                    } else if (e.action.name === 'subflowInstance') {
                        vscode.postMessage({
                            type: 'open',
                            element: 'flow',
                            path: e.action.value[1],
                            instanceId: e.action.value[0]
                        });
                    } else if (e.action.name === 'input' || e.action.name === 'output') {
                        // instanceEdit update
                        const direction = e.action.name;
                        const instance = Flow.configurator?.instance;
                        if (instance) {
                            const workflowInstanceId =
                                (instance as any).flowInstanceId || instance.id;
                            let putUrl = `${flowInput.baseUrl}/data/${workflowInstanceId}/${direction}`;
                            if ((instance as any).stepId) {
                                putUrl += `?stateInstanceId=${instance.id}`;
                            }
                            const body = '' + e.action.value;
                            fetch(putUrl, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...this.tokenHeader
                                },
                                body
                            })
                                .then((res) => {
                                    if (res.ok) {
                                        (instance as any).data[direction] = JSON.parse(body);
                                        if (Flow.configurator?.flowElement) {
                                            this.updateConfigurator(
                                                Flow.configurator?.flowElement,
                                                [instance]
                                            );
                                        }
                                    }
                                })
                                .catch(console.error);
                        }
                    }
                } else {
                    await this.updateFlow();
                }
            })
        );
        this.disposables.push(
            Flow.configurator.onReposition((repositionEvent) => {
                updateState({
                    configurator: {
                        open: !!repositionEvent.position,
                        position: repositionEvent.position
                    }
                });
            })
        );

        // theme-based icons (lastly make flow header visible)
        const toolImgs = [
            ...document.querySelectorAll('input[type=image]'),
            ...document.querySelectorAll('img')
        ] as HTMLInputElement[];
        for (const toolImg of toolImgs) {
            if (toolImg.hasAttribute('data-icon')) {
                const icon = toolImg.getAttribute('data-icon') as string;
                toolImg.setAttribute('src', `${this.options.iconBase}/${icon}`);
                toolImg.style.display = 'inline-block';
            }
        }
        (document.getElementById('flow-header') as HTMLDivElement).style.display = 'flex';

        // diagram
        const canvasElement = document.getElementById('diagram-canvas') as HTMLCanvasElement;
        this.flowDiagram = new flowbee.FlowDiagram(
            text,
            canvasElement,
            file,
            [...descriptors, ...customDescriptors],
            this.options.diagramOptions
        );
        this.disposables.push(this.flowDiagram.onFlowChange(async (_e) => await this.updateFlow()));
        this.disposables.push(
            this.flowDiagram.onFlowElementAdd((onAdd) => {
                if (onAdd.element.type === 'step' && onAdd.descriptor) {
                    // added a step
                    this.updateConfigurator(onAdd.element, undefined);
                }
            })
        );

        this.flowDiagram.dialogProvider = new DialogProvider();
        const menuProvider = new MenuProvider(
            this.flowDiagram,
            (flowElement, instances, doOpen) => {
                this.updateConfigurator(flowElement, instances, doOpen); // retain this context
            }
        );
        this.flowDiagram.contextMenuProvider = menuProvider;
        this.disposables.push(
            this.flowDiagram.onFlowElementSelect(async (flowElementSelect) => {
                updateState({ selected: { id: flowElementSelect.element.id } });
                if (Flow.configurator) {
                    this.updateConfigurator(flowElementSelect.element, flowElementSelect.instances);
                }
            })
        );
        this.disposables.push(
            this.flowDiagram.onFlowElementDrill(async (flowElementDrill) => {
                if (Flow.configurator && this.flowDiagram.mode !== 'connect') {
                    this.updateConfigurator(
                        flowElementDrill.element,
                        flowElementDrill.instances,
                        true
                    );
                }
            })
        );
        this.disposables.push(
            this.flowDiagram.onFlowElementUpdate(async (flowElementUpdate) => {
                if (Flow.configurator?.flowElement?.id === flowElementUpdate.element.id) {
                    this.updateConfigurator(flowElementUpdate.element);
                }
            })
        );

        this.toolboxContainer = document.getElementById('toolbox-container') as HTMLDivElement;
        const flowHeader = document.querySelector('.flow-header') as HTMLDivElement;
        if (readonly) {
            this.toolboxContainer.style.display = 'none';
            flowHeader.innerHTML = '';
        } else {
            const toolboxElement = document.getElementById('flow-toolbox') as HTMLDivElement;
            toolboxElement.innerHTML = '';
            this.toolbox = new flowbee.Toolbox(descriptors, toolboxElement);

            // open/close toolbox
            const toolboxHeader = this.toolboxContainer.querySelector(
                '.toolbox-header'
            ) as HTMLDivElement;
            toolboxHeader.style.cursor = 'pointer';
            this.toolboxCaret = flowHeader.querySelector('.toolbox-caret') as HTMLSpanElement;
            this.toolboxCaret.style.display = 'none';
            toolboxHeader.onclick = (_e: MouseEvent) => {
                this.setToolboxState('closed');
            };
            this.toolboxCaret.onclick = (_e: MouseEvent) => {
                this.setToolboxState('open');
            };

            // custom tool pane
            const customToolboxElement = document.getElementById('flow-custom') as HTMLDivElement;
            customToolboxElement.innerHTML = '';
            this.customToolbox = new flowbee.Toolbox(customDescriptors, customToolboxElement);

            // flow splitter
            const containerElement = document.getElementById('container') as HTMLDivElement;
            new FlowSplitter(containerElement, this.toolboxContainer, this.toolboxCaret);

            // toolbox splitter
            const toolboxSplitter = new ToolboxSplitter(this.toolboxContainer);
            // new custom
            const newCustom = document.getElementById('newCustom') as HTMLInputElement;
            newCustom.onclick = (_e: MouseEvent) => {
                toolboxSplitter.toggleFlowCustom();
                vscode.postMessage({ type: 'new', element: 'custom' });
            };

            // actions
            this.drawingTools = new DrawingTools(
                document.getElementById('flow-header') as HTMLDivElement
            );
            this.drawingTools.onOptionToggle((e) => this.onOptionToggle(e));
            this.drawingTools.onZoomChange((e: ZoomChangeEvent) => {
                this.flowDiagram.zoom = e.zoom;
            });
            this.switchMode('select');

            this.flowActions = new FlowActions(
                this.options.iconBase,
                document.getElementById('flow-actions') as HTMLDivElement
            );
            const handleFlowAction = (e: FlowActionEvent) => {
                if (
                    e.action === 'submit' ||
                    e.action === 'run' ||
                    e.action === 'debug' ||
                    e.action === 'stop'
                ) {
                    this.closeConfigurator();
                    if (!e.target) {
                        this.flowDiagram.render(this.options.diagramOptions);
                    }
                }
                if (e.action === 'submit') {
                    this.onFlowAction({ action: 'run', options: { submit: true } });
                } else {
                    this.onFlowAction(e);
                }
            };
            this.flowActions.onFlowAction(handleFlowAction);
            menuProvider.onFlowAction(handleFlowAction);
        }
    }

    get tokenHeader(): { [key: string]: string } {
        return {
            ...(this.config.apiToken && {
                Authorization: `Bearer ${this.config.apiToken}`
            })
        };
    }

    setToolboxState(state: 'open' | 'closed') {
        if (this.toolboxContainer && this.toolboxCaret) {
            if (state === 'closed') {
                this.toolboxContainer.style.display = 'none';
                this.toolboxCaret.style.display = 'inline-block';
            } else {
                this.toolboxCaret.style.display = 'none';
                this.toolboxContainer.style.display = 'flex';
            }
        }
    }

    switchMode(mode: flowbee.Mode) {
        this.flowDiagram.mode = mode;
        this.drawingTools?.switchMode(mode);
        this.flowDiagram.readonly = mode === 'runtime' || this.readonly;
    }

    render() {
        this.flowDiagram.render(this.options.diagramOptions);
        if (!this.readonly) {
            this.toolbox?.render(this.options.toolboxOptions);
            this.updateCustomDescriptors(customDescriptors);
        }
        if (Flow.configurator?.isOpen) {
            const cfgr = Flow.configurator;
            cfgr.render(
                cfgr.flowElement,
                cfgr.instance ? [cfgr.instance] : [],
                cfgr.template || {},
                this.getConfiguratorOptions(),
                this.getSourceLink(cfgr.flowElement)
            );
            if (cfgr.flowElement.id) {
                this.flowDiagram.select(cfgr.flowElement.id);
            }
        }
    }

    getConfiguratorOptions(): flowbee.ConfiguratorOptions {
        return {
            ...this.options.configuratorOptions,
            ...(this.config.showSourceTab && { sourceTab: 'yaml' })
        };
    }

    getSourceLink(flowElement: flowbee.FlowElement): flowbee.SourceLink | undefined {
        if (flowElement.path?.endsWith('.ts')) {
            return { path: flowElement.path };
        } else if (flowElement.path === 'typescript' && flowElement.attributes?.tsFile) {
            return { path: flowElement.attributes.tsFile };
        }
    }

    updateCustomDescriptors(descriptors: flowbee.Descriptor[]) {
        customDescriptors = descriptors;
        const customToolboxElement = document.getElementById('flow-custom') as HTMLDivElement;
        customToolboxElement.innerHTML = '';
        this.customToolbox = new flowbee.Toolbox(customDescriptors, customToolboxElement);
        this.disposables.push(
            this.customToolbox.onItemOpen((openEvent) => {
                vscode.postMessage({ type: 'edit', element: 'custom', url: openEvent.url });
            })
        );
        this.customToolbox.render(this.options.toolboxOptions);
    }

    findStep(stepId: string): flowbee.Step | undefined {
        return this.flowDiagram.flow.steps?.find((s) => s.id === stepId);
    }

    isRestOperation(stepId: string): boolean {
        const step = this.findStep(stepId);
        if (step?.attributes?.functionRef) {
            const funcs = this.flowDiagram.flow.attributes?.functions;
            if (funcs) {
                const funcRow = JSON.parse(funcs).find(
                    (row: string[]) => row.length && row[0] === step.attributes?.functionRef
                );
                if (funcRow?.length > 1) return funcRow[1] === 'rest';
            }
        }
        return false;
    }

    stepInstanceHasTask(stepId: string): boolean {
        const stepInstance = this.flowDiagram.instance?.stepInstances?.find((si) => {
            return si.stepId === stepId;
        });
        return !!stepInstance?.data.task;
    }

    async updateStep(
        stepId: string,
        reqObjOrFile: object | string,
        attr?: { name: string; row?: number; column?: number }
    ) {
        const step = this.findStep(stepId);
        if (step) {
            if (!step.attributes) step.attributes = {};
            if (typeof reqObjOrFile === 'object') {
                const reqName = Object.keys(reqObjOrFile)[0];
                step.name = reqName.replace(/_/g, EOL);
                const req = (reqObjOrFile as any)[reqName];
                step.attributes.url = req.url;
                step.attributes.method = req.method;
                if (req.headers) {
                    const rows: string[][] = [];
                    for (const key of Object.keys(req.headers)) {
                        rows.push([key, '' + req.headers[key]]);
                    }
                    step.attributes.headers = JSON.stringify(rows);
                }
                if (req.body) step.attributes.body = req.body;
            } else {
                if (attr) {
                    if (typeof attr.row === 'number' && typeof attr.column === 'number') {
                        // select file in table row
                        let attrVal = step.attributes[attr.name];
                        if (!attrVal) attrVal = '[]';
                        const rows = JSON.parse(attrVal);
                        if (attr.row < rows.length) {
                            rows[attr.row][attr.column] = reqObjOrFile;
                        } else {
                            const newRow = [];
                            for (let i = 0; i < attr.column; i++) {
                                newRow.push('');
                            }
                            newRow.push(reqObjOrFile);
                            rows.push(newRow);
                        }
                        step.attributes[attr.name] = JSON.stringify(rows);
                    } else {
                        step.attributes[attr.name] = reqObjOrFile;
                    }
                } else {
                    if (reqObjOrFile.endsWith('.ts')) {
                        step.attributes.tsFile = reqObjOrFile;
                    }
                }
            }
            await this.updateFlow(false);
        }
    }

    async getTemplate(flowElement: flowbee.FlowElement): Promise<flowbee.ConfigTemplate> {
        const template: flowbee.ConfigTemplate = {};
        const templ = await templates.getConfigTemplate(
            this.flowDiagram.mode === 'runtime' ? 'inspect' : 'config',
            flowElement
        );
        // conditional tabs
        for (const tab of Object.keys(templ)) {
            let addTab = true;
            const tabIf = (templ[tab] as any)['if'];
            if (tabIf) {
                const openParen = tabIf.indexOf('(');
                if (openParen > 0 && tabIf.indexOf(')') === tabIf.length - 1) {
                    const arg = tabIf.substring(openParen + 1, tabIf.length - 1);
                    addTab = (this as any)[tabIf.substring(0, openParen)](
                        (flowElement as any)[arg]
                    );
                } else {
                    addTab = (this as any)[tabIf](flowElement);
                }
                if (!addTab) {
                    continue;
                }
            }
            if (addTab) template[tab] = templ[tab];
        }
        return template;
    }

    async updateConfigurator(
        flowElement: flowbee.FlowElement,
        instances?: flowbee.FlowElementInstance[],
        doOpen = false,
        position?: { left: number; top: number; width: number; height: number }
    ) {
        if (Flow.configurator && (doOpen || Flow.configurator?.isOpen)) {
            const template = await this.getTemplate(flowElement);
            for (const tab of Object.keys(template)) {
                for (const widget of (template as flowbee.ConfigTemplate)[tab].widgets) {
                    // dynamic default value
                    if (typeof widget.default === 'object') {
                        const defaultObj = widget.default;
                        widget.default = (element) => {
                            const expr = Object.keys(defaultObj)[0];
                            return this.getDynamicDefault(expr, element, defaultObj[expr]);
                        };
                    }
                    // dynamic options values
                    if (typeof widget.options === 'string') {
                        const optsAttrName = widget.options;
                        widget.options = () => {
                            return this.getDynamicOptions(optsAttrName);
                        };
                    }
                }
            }
            if (instances && instances.length > 0) {
                const instance = instances[instances.length - 1] as any;
                if (instance.data?.log) {
                    instance.log = JSON.stringify(instance.data.log);
                }
                if (instance.data?.values) {
                    instance.values = JSON.stringify(instance.data.values);
                }
                if (instance.data?.input) {
                    instance.input = JSON.stringify(instance.data.input, null, 2);
                }
                if (instance.data?.output) {
                    instance.output = JSON.stringify(instance.data.output, null, 2);
                } else {
                    instance.output = '';
                }
                // TODO better mechanism than endsWith()
                if (
                    instance.data?.stateType === 'operation' &&
                    (instance.data?.stepPath === 'request' ||
                        instance.data?.stepPath?.endsWith('request.ts') ||
                        this.isRestOperation(instance.stepId)) &&
                    flowInput.baseUrl
                ) {
                    // this goes in the background
                    fetch(`${flowInput.baseUrl}/invocations/${instance.id}`, {
                        method: 'GET',
                        headers: { Accept: 'application/json', ...this.tokenHeader }
                    })
                        .then((response) => response.json())
                        .then((invocation) => {
                            const opts = {
                                noCompatMode: true,
                                skipInvalid: true,
                                indent: this.options.indent,
                                lineWidth: -1
                            };
                            instance.request = jsYaml.dump(invocation.request, opts);
                            if (invocation.response) {
                                let body = invocation.response.body;
                                if (typeof body === 'string' && body.indexOf('\n') === -1) {
                                    // needs formatting: TODO refactor
                                    if (body.startsWith('"') && body.endsWith('"')) {
                                        // TODO why?
                                        body = body.substring(1, body.length - 1);
                                    }
                                    const isJson =
                                        (body.startsWith('{') && body.endsWith('}')) ||
                                        (body.startsWith('[') && body.endsWith(']'));
                                    if (isJson) {
                                        invocation.response.body = JSON.stringify(
                                            JSON.parse(body),
                                            null,
                                            2
                                        );
                                    } else {
                                        const isXml = body.startsWith('<') && body.endsWith('>');
                                        console.log('IS XML' + isXml);
                                        // if (isXml) {
                                        //     invocation.response.body = require('xml-formatter')(
                                        //         body,
                                        //         { indentation: '  ', collapseContent: true }
                                        //     );
                                        // }
                                    }
                                }
                                instance.response = jsYaml.dump(invocation.response, opts);
                            }
                        })
                        .catch((err) => {
                            console.trace(err);
                        });
                }
                // TODO better way to check for subflows
                if (
                    instance.data?.stateType === 'parallel' ||
                    instance.data?.stepPath === 'subflow' ||
                    (instance.data?.stepPath?.endsWith('orchestrator.ts') && flowInput.baseUrl)
                ) {
                    // this goes in the background
                    fetch(
                        `${flowInput.baseUrl}/instances?parentInstanceId=${this.flowDiagram.instance?.id}&parentStateInstanceId=${instance.id}`,
                        {
                            method: 'GET',
                            headers: { Accept: 'application/json', ...this.tokenHeader }
                        }
                    )
                        .then((response) => response.json())
                        .then((subflows) => {
                            // TODO this pattern can easily be made declarative
                            const rows: string[][] = [];
                            for (const subflow of subflows) {
                                rows.push([
                                    subflow.id || '',
                                    subflow.workflow || '',
                                    subflow.parentBranch || '',
                                    subflow.status || '',
                                    subflow.start || '',
                                    subflow.end || ''
                                ]);
                            }
                            instance.subflows = JSON.stringify(rows);
                        })
                        .catch((err) => {
                            console.trace(err);
                        });
                }
                if (instance.data?.task && flowInput.baseUrl) {
                    fetch(`${flowInput.baseUrl}/tasks/${instance.data.task}`, {
                        method: 'GET',
                        headers: { Accept: 'application/json', ...this.tokenHeader }
                    })
                        .then((response) => response.json())
                        .then((task) => {
                            if (task.values) {
                                instance.taskValues = JSON.stringify(
                                    Object.keys(task.values).reduce((rows, key) => {
                                        rows.push([key, task.values[key]]);
                                        return rows;
                                    }, [] as string[][])
                                );
                            }
                        })
                        .catch((err) => {
                            console.trace(err);
                        });
                }
            }
            if (!Flow.configurator.isOpen) {
                // close bottom panel to avoid obscuring configurator
                vscode.postMessage({ type: 'configurator' });
            }

            Flow.configurator.render(
                flowElement,
                instances || [],
                template,
                this.getConfiguratorOptions(),
                this.getSourceLink(flowElement),
                position
            );
            updateState({
                selected: {
                    id: flowElement.id,
                    instances: instances
                },
                configurator: {
                    open: true,
                    position: {
                        left: Flow.configurator.left,
                        top: Flow.configurator.top,
                        width: Flow.configurator.width,
                        height: Flow.configurator.height
                    }
                }
            });
        }
    }

    /**
     * Get options list from flow table attributes
     * TODO other possibilities besides flow attributes
     * (especially attribute from another tab on same step)
     * other types besides tables?
     */
    getDynamicOptions(optsAttrName: string): string[] {
        if (optsAttrName === 'teams') {
            return teams;
        }
        const attributes = this.flowDiagram.flow.attributes;
        if (attributes) {
            const attrVal = attributes[optsAttrName];
            if (attrVal) {
                if (attrVal.startsWith('[[') && attrVal.endsWith(']]')) {
                    return JSON.parse(attrVal).map((row: string[]) => row[0]);
                }
            }
        }
        return [];
    }

    /**
     * Get dynamically-determined default attribute value.
     * Used for link waypoint configuration
     */
    getDynamicDefault(
        expr: string,
        element: { attributes?: { [key: string]: string } },
        fallback: string
    ): string {
        if (element.attributes) {
            if (expr.startsWith('display.') && element.attributes.display) {
                return safeEval(expr, {
                    ...element.attributes,
                    display: flowbee.LinkLayout.fromAttr(element.attributes.display)
                });
            }
            return safeEval(expr, element.attributes);
        }
        return fallback;
    }

    openConfigurator() {
        if (Flow.configurator && !Flow.configurator.isOpen) {
            this.updateConfigurator(
                this.flowDiagram.flow,
                this.flowDiagram.instance ? [this.flowDiagram.instance] : [],
                true
            );
        }
    }

    closeConfigurator() {
        Flow.configurator?.close();
        updateState({ configurator: { open: false } });
    }

    onOptionToggle(e: OptionToggleEvent) {
        const drawingOption = e.option;
        if (
            drawingOption === 'select' ||
            drawingOption === 'connect' ||
            drawingOption === 'runtime'
        ) {
            this.flowDiagram.mode = drawingOption;
            if (drawingOption === 'connect') {
                this.closeConfigurator();
                this.flowDiagram.instance = null;
                this.flowDiagram.readonly = this.readonly;
                updateState({ mode: drawingOption });
                this.flowDiagram.focus();
            } else if (drawingOption === 'runtime') {
                this.closeConfigurator();
                vscode.postMessage({
                    type: 'instance'
                });
                // state update pending instance postback
            } else {
                if (Flow.configurator) {
                    this.updateConfigurator(Flow.configurator.flowElement);
                }
                this.flowDiagram.instance = null;
                this.flowDiagram.readonly = this.readonly;
                updateState({ mode: drawingOption });
            }
        } else {
            (this.options as any)[drawingOption] = !(this.options as any)[drawingOption];
        }
        this.flowDiagram.render(this.options.diagramOptions);
    }

    async onFlowAction(e: FlowActionEvent) {
        const flowAction = e.action;
        if (flowAction === 'run' || flowAction === 'values') {
            this.closeConfigurator();
            const input = new Input(this.flowDiagram.flow.path, this.options.iconBase, flowInput);
            const enteredInput = await input.prompt();
            if (enteredInput) {
                flowInput = enteredInput;
                updateState({ input: flowInput });
            } else {
                return; // run canceled
            }
        } else if (flowAction === 'toolbox') {
            this.setToolboxState(e.options.state);
            return;
        }

        vscode.postMessage({
            type: flowAction,
            flow: this.flowDiagram.flow.path,
            ...(e.element && { element: e.element }),
            ...(e.target && { target: e.target }),
            ...(e.options && { options: e.options }),
            ...(flowInput && { input: flowInput })
        });
    }

    /**
     * Update the flow diagram document.
     */
    async updateFlow(post = true) {
        const indent = this.options.indent;
        const text = this.options.yaml
            ? this.flowDiagram.toYaml({ indent })
            : this.flowDiagram.toJson({ indent });

        if (post) {
            await vscode.postMessage({
                type: 'change',
                text
            });
        }

        updateState({
            base: this.base,
            file: this.file,
            text,
            config: {
                webSocketUrl: this.config.webSocketUrl,
                showSourceTab: this.config.showSourceTab,
                apiToken: this.config.apiToken
            },
            readonly: this.flowDiagram.readonly,
            mode: 'select'
        });
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}

window.addEventListener('message', async (event) => {
    const message = event.data; // json message data from extension
    console.debug(`message: ${JSON.stringify(message, null, 2)}`);
    if (message.type === 'update') {
        customDescriptors = message.customDescriptors || [];
        if (!templates) {
            templates = new Templates(message.base, customDescriptors);
        }
        let text = message.text?.trim();
        let isNew = false;
        if (!text) {
            // new flow
            isNew = true;
            text = await templates.get('new-flow.yaml');
        }
        const flow = new Flow(message.base, message.config, text, message.file, message.readonly);
        flow.switchMode('select');
        flow.flowDiagram.readonly = message.readonly;
        if (isNew) {
            if (message.readonly) {
                // new and readonly means blank
                updateState({ readonly: true });
                document.getElementById('container')!.style.visibility = 'hidden';
                return;
            } else {
                console.info(`Saving new flow: ${message.file}`);
                await flow.updateFlow();
            }
        }
        flow.render();
        // save state
        flowInput = message.input || {};
        teams = message.teams || [];
        updateState({
            base: message.base,
            file: message.file,
            text,
            readonly: message.readonly,
            mode: 'select',
            config: message.config,
            customDescriptors,
            input: flowInput,
            teams
        });
        if (message.select) {
            let id = message.select;
            const dot = id.indexOf('.');
            if (dot > 0) {
                id = id.substring(dot + 1);
            }
            flow.flowDiagram.select(id, true);
        }
    } else if (message.type === 'instance') {
        const flow = readState(false);
        if (flow) {
            flow.flowDiagram.instance = message.instance;
            const hasInstance = !!flow.flowDiagram.instance;
            if (hasInstance) {
                flow.flowDiagram.readonly = true;
                flow.switchMode('runtime');
                updateState({ mode: 'runtime' });
                if (flow.flowDiagram.instance && Flow.configurator) {
                    if (Flow.configurator?.flowElement?.type === 'flow') {
                        flow.updateConfigurator(flow.flowDiagram.flow, [flow.flowDiagram.instance]);
                    }
                }
            } else {
                flow.switchMode(flow.flowDiagram.mode);
            }
        }
    } else if (message.type === 'custom') {
        const flow = readState(false);
        if (flow) {
            flow.updateCustomDescriptors(message.descriptors);
        }
        updateState({ customDescriptors: message.descriptors });
    } else if (message.type === 'step') {
        const flow = readState(false);
        if (flow) {
            await flow.updateStep(
                message.stepId,
                message.reqObj || message.file || message.flow,
                message.attr
            );
        }
    } else if (message.type === 'action') {
        readState()?.onFlowAction({
            action: message.action,
            target: message.target,
            options: message.options
        });
    } else if (message.type === 'mode') {
        updateState({ mode: message.mode });
        const flow = readState();
        if (flow) {
            flow.switchMode(message.mode);
        }
    } else if (message.type === 'theme-change') {
        readState();
    } else if (message.type === 'confirm') {
        dlgEvt.emit({ result: message.result });
    } else if (message.type === 'open-configurator') {
        const flow = readState();
        flow?.openConfigurator();
    }
});

interface FlowState {
    base?: string;
    file?: string;
    text?: string;
    readonly?: boolean; // this means the file is readonly
    mode?: flowbee.Mode;
    config?: Config;
    selected?: {
        id?: string; // selected but no id means flow selected
        instances?: flowbee.FlowElementInstance[];
    };
    configurator?: {
        open: boolean;
        position?: { left: number; top: number; width: number; height: number };
    };
    customDescriptors?: flowbee.Descriptor[];
    input?: FlowInput;
    teams?: string[];
}

function updateState(delta: FlowState) {
    vscode.setState({ ...vscode.getState(), ...delta });
}

function readState(loadInstance = true): Flow | undefined {
    const state = vscode.getState();
    if (state && state.base && state.file) {
        customDescriptors = state.customDescriptors || [];
        templates = new Templates(state.base, customDescriptors);
        const flow = new Flow(state.base, state.config, state.text, state.file, state.readonly);
        flow.flowDiagram.readonly = state.readonly;
        const mode = state.mode || 'select';
        if (mode === 'runtime' && loadInstance) {
            vscode.postMessage({
                type: 'instance'
            });
        }
        flow.switchMode(mode);
        flow.render();
        if (state.selected) {
            if (state.selected.id) {
                flow.flowDiagram.select(state.selected.id, false);
            }
            if (state.configurator?.open) {
                const selected = flow.flowDiagram.selected;
                const flowElem = selected.length === 1 ? selected[0] : flow.flowDiagram.flow;
                const instances = state.selected.instances || [];
                if (instances.length > 0 || flow.flowDiagram.mode !== 'runtime') {
                    flow.updateConfigurator(flowElem, instances, true, state.configurator.position);
                }
            }
        }
        if (state.input) flowInput = state.input;
        if (state.teams) teams = state.teams;
        return flow;
    }
}

readState();
