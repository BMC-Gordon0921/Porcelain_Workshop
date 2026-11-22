// 小工具构建专用：把 `three` 指向 three r150（最后一条保留 WebGL1 运行时的版本线）。
// 桌面/原生构建不经过本文件，仍用 package.json 里的 three r186。
//
// 只做转发，不覆盖任何常量：r150 已经有 SRGBColorSpace('srgb') / LinearSRGBColorSpace，
// 覆盖成 encoding 数字反而会破坏 ColorManagement 的转换表。
// colorSpace / outputColorSpace 两个属性由 src/platform/three-compat.js 在运行期补上。
export * from 'three-legacy';
