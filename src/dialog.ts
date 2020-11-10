export interface DialogMessage {
    title?: string;
    text: string;
    level: 'info' | 'warn' | 'error';
}

export interface DialogProvider {
    alert(message: DialogMessage);
    confirm(message: DialogMessage): boolean;
}

export class DefaultDialog implements DialogProvider {
    alert(message: DialogMessage) {
        alert(message.text);
    }
    confirm(message: DialogMessage): boolean {
        return !!confirm(message.text);
    }
}