# License Boundary Labels

The app labels licenses by practical review boundary, not by legal vocabulary alone.

## Buckets

1. Permissive with notices / 宽松许可，保留声明
   - MIT, Apache-2.0, BSD, ISC, Unlicense, 0BSD, Zlib.
   - Usually practical for learning from, integrating with, or distributing when required notices are preserved.

2. Use with obligations / 可用但需履约
   - MPL, LGPL, EPL, EUPL, CC-BY.
   - Practical use may be possible, but file-level, linking, attribution, or redistribution duties need review.

3. Source release on distribution / 分发需开源
   - GPL family.
   - Distribution may trigger source-release obligations, so integration and release plans need careful review.

4. Hosted-service source-release risk / 托管服务开源风险
   - AGPL, SSPL, OSL.
   - Network service use may trigger source-release obligations; prefer monitoring, learning, or independent implementation.

5. Restricted or non-commercial / 非商业或受限
   - Non-commercial or restrictive licenses such as CC-BY-NC.
   - Do not use beyond the granted scope unless the exact license permits the intended scenario.

6. No license: monitor only / 无许可：仅监控
   - No recognized SPDX license, NOASSERTION, or unclear license metadata.
   - Public GitHub visibility does not grant copying, modification, or redistribution rights.

7. Manual review before reuse / 人工复核后再用
   - Recognized but less common/custom licenses.
   - Read the exact license before copying or redistributing.

This is an engineering risk model, not legal advice. High-value or externally released use should still be reviewed by qualified counsel.
