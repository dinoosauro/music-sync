/**
 * An Object that contains all the open source libraries used by music-sync
 */
export const openSourceData = [
    {name: "React", link: "https://github.com/facebook/react", license: "MIT", author: "Meta Platforms, Inc. and affiliates."},
    {name: "Bootstrap", license: "MIT", author: "2011-2025 The Bootstrap Authors", link: "https://github.com/twbs/bootstrap"},
    {name: "Bootstrap Icons", license: "MIT", author: "2019-2024 The Bootstrap Authors", link: "https://github.com/twbs/icons"},
    {name: "js-levenshtein", license: "MIT", author: "2017 Gustaf Andersson", link: "https://github.com/gustf/js-levenshtein"},
    {name: "music-metadata", license: "MIT", author: "2025 Borewit", link: "https://github.com/Borewit/music-metadata"},
    {name: "music-sync", license: "MIT", author: "2025 Dinoosauro", link: "https://github.com/dinoosauro/music-sync"}
]

/**
 * Get the license of an open source product.
 * @param license the license to get
 * @param author the author of the displayed library (the string to add in the license)
 * @returns the license as a string
 */
export function licenseText(license = "MIT", author?: string) {
    switch (license) {
        case "MIT":
            return `MIT License
Copyright (c) ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
    }
}