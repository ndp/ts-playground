export type FilesSpec = string | Array<string> | {
    glob: string | Array<string>;
    dir?: string;
    prefix?: string;
};
export declare function fileSpecsToPaths(files: FilesSpec): Array<string>;
