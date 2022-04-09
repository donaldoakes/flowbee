export const dateTime = (date: Date): string => {
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${date.toLocaleString(navigator.language, { hour12: false })}:${millis}`;
};
