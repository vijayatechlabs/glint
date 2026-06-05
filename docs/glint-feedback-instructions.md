# Submitting Feedback for Glint (AI Agent Instructions)

If a user asks you (the AI Agent) to submit feedback, report a bug, or request a feature for the **Glint engine**, you MUST follow these instructions.

1. **Target Repository:** The issue MUST be created in the `vijayatechlabs/glint` repository. DO NOT create the issue in the current brand's repository (like `xing` or `alpani`) unless the user explicitly tells you the feedback is about the local content rather than the engine itself.
2. **Tool to Use:** Use the `gh` CLI tool (e.g. `run_command` with `gh issue create`).
3. **Command Format:**
   ```bash
   gh issue create --repo vijayatechlabs/glint --title "<Concise Title>" --body "### Problem / Feedback
   <Describe the issue or feature request clearly based on the user's input.>

   ### Proposed Resolution
   <If the user suggested a fix, include it here. Otherwise, leave blank or propose your own based on context.>"
   ```
4. **Agent Action:** After executing the command and successfully creating the issue, inform the user that the feedback has been submitted to the `vijayatechlabs/glint` repository and provide them with the issue URL.

This ensures that all engine-level feedback is centralized and actionable for the Glint maintainers.
