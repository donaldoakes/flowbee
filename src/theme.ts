export class Theme {
    constructor(readonly name: string) {}
    get isDark() {
        return this.name === 'dark' || this.name.endsWith('-dark');
    }
    get isBuiltin() {
        return this.name === 'light' || this.name === 'dark';
    }
}

