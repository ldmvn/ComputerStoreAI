## Quy tắc commit message

- Viết commit message bằng tiếng Việt tự nhiên, ngắn gọn, mô tả rõ nội dung thay đổi.
- Không dùng tiền tố Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `ci:`, `perf:`, hoặc dạng `feat(scope):`.
- Ví dụ đúng: `Hoàn thiện giao diện Floating Support Widget`, `Sửa lỗi đăng nhập`, `Thêm chức năng tư vấn Build PC`.
- Không tự động commit hoặc push — chỉ thực hiện khi được yêu cầu rõ ràng.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
