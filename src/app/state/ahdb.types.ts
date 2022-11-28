export type FAQ = {
    code: string,
    html: string,
    text: string,
    updated: DateTime
};

export type DateTime = {
    date: Date,
    timezone_type: number,
    timezone: string
};