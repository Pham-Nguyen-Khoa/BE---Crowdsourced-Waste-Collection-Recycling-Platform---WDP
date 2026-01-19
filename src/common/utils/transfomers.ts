import { Transform } from "class-transformer";

export const TransformToInt = () =>
    Transform(({ value }) => {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
    });