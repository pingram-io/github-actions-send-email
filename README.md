# Pingram Send Email

A GitHub Action to send email from your workflows with
[Pingram](https://pingram.io) — deploy notifications, build failure alerts, or
any transactional email you need out of CI.

```yaml
- uses: pingram-io/github-actions-send-email@v1
  with:
    api-key: ${{ secrets.PINGRAM_API_KEY }}
    type: deploy-status
    to: team@example.com
    subject: Deploy succeeded
    html: <p><code>${{ github.sha }}</code> is live.</p>
```

Need to notify by text message instead? See
[Pingram Send SMS](https://github.com/pingram-io/github-actions-send-sms).

## Setup

1. Grab a `pingram_sk_...` key from the **API Keys** page in the
   [Pingram dashboard](https://app.pingram.io).
2. Add it as a repository secret named `PINGRAM_API_KEY`.

## Examples

### Notify the team when a build fails

`if: failure()` is what turns this into a build failure notification — the step
only runs when something earlier in the job failed.

```yaml
- uses: pingram-io/github-actions-send-email@v1
  if: failure()
  with:
    api-key: ${{ secrets.PINGRAM_API_KEY }}
    type: ci-alerts
    to: oncall@example.com
    subject: '${{ github.workflow }} failed on ${{ github.ref_name }}'
    html: |
      <p><a href="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}">
      View the failed run</a></p>
```

### Email several people

`to`, `cc`, and `bcc` all take comma-separated lists. Each `to` address is
sent as its own email.

```yaml
- uses: pingram-io/github-actions-send-email@v1
  with:
    api-key: ${{ secrets.PINGRAM_API_KEY }}
    type: release-notes
    to: team@example.com, oncall@example.com
    cc: product@example.com, support@example.com
    subject: 'Released ${{ github.ref_name }}'
    html: <p>Release notes attached.</p>
```

### Capture the tracking id

```yaml
- uses: pingram-io/github-actions-send-email@v1
  id: notify
  with:
    api-key: ${{ secrets.PINGRAM_API_KEY }}
    type: deploy-status
    to: team@example.com
    subject: Deployed
    html: <p>Done.</p>

- run: |
    echo "Sent as ${{ steps.notify.outputs.tracking-id }}"
```

## Inputs

| Name            | Required | Default | Description                                  |
| --------------- | -------- | ------- | -------------------------------------------- |
| `api-key`       | yes      |         | Pingram API key (`pingram_sk_...`)           |
| `type`          | yes      |         | Label used to group the send in your logs    |
| `to`            | yes      |         | Recipient email, or a comma-separated list   |
| `subject`       | yes      |         | Subject line                                 |
| `html`          | yes      |         | HTML body                                    |
| `from-name`     | no       |         | Sender display name                          |
| `from-address`  | no       |         | Sender address on a verified domain          |
| `preview-text`  | no       |         | Inbox preview text                           |
| `reply-to`      | no       |         | Comma-separated reply-to addresses           |
| `cc`            | no       |         | Comma-separated CC addresses                 |
| `bcc`           | no       |         | Comma-separated BCC addresses                |
| `schedule`      | no       |         | ISO 8601 timestamp to send at instead of now |
| `region`        | no       | `us`    | `us`, `eu` or `ca`                           |
| `base-url`      | no       |         | Custom API base URL, overrides `region`      |
| `fail-on-error` | no       | `true`  | Fail the step when the send fails            |

`type` is any string you choose. It does not have to exist in the dashboard
beforehand — it is what the send is grouped under in Logs and Insights.

Set `fail-on-error: false` to log a warning instead of failing the job, so a
notification problem can never block a deploy.

## Outputs

| Name          | Description                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `tracking-id` | Tracking id(s) for the send — comma-separated when `to` has multiple recipients |

## Regions

Use the region your Pingram account lives in. `us` is the default.

| Region | API                 |
| ------ | ------------------- |
| `us`   | `api.pingram.io`    |
| `eu`   | `api.eu.pingram.io` |
| `ca`   | `api.ca.pingram.io` |

## Pinning

`@v1` tracks the latest v1.x release. To pin exactly, use a commit SHA:

```yaml
- uses: pingram-io/github-actions-send-email@<commit-sha>
```

## Support

Questions, bugs or a missing input? Email
[hello@pingram.io](mailto:hello@pingram.io).

## License

[MIT](LICENSE)
