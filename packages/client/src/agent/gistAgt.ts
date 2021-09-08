import { Ceremony, Computation } from "../types"
import { FirestoreAgt } from "./firestoreAgt"
import * as dayjs from "dayjs"
import { ymdHms } from "../utils"

interface GistFiles {[fileName: string]: { content: string }}

interface GistCreateRequest {
  description: string,
  public: boolean,
  files: GistFiles,
}

export class GistAgt {
  private firestoreAgt = new FirestoreAgt()

  private async publishGist(
    req: GistCreateRequest,
    gitHubAccessToken: string,
  ): Promise<void> {
    await fetch('https://api.github.com/gists', {
      method: 'post',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${gitHubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    })
  }

  private composeContent(ceremony: Ceremony, computation: Computation): string {
    const now = this.firestoreAgt.now()
    const sigs = computation.contribSigs.map(x =>
`Circuit: ${x.circuitId}
Contributor #: ${x.participantIdx}
Hash: ${Buffer.from(x.sig).toString("hex")}
`
    ).join("\n")

    const doc = `I contributed to the zkcream/${ceremony.id} trusted setup multi-party ceremony.
The following are my contribution signatures:

${sigs}
${now.toDate()}
GitHub User ID: ${computation.user}
`
    return doc
  }

  async publishContribDoc(ceremony: Ceremony, computation: Computation): Promise<void> {
    const content = this.composeContent(ceremony, computation)
    const description = `Summary of ${ceremony.id} phase2 trusted setup MPC contribution`

    const req: GistCreateRequest = {
      description,
      public: true,
      files: {
        "attestation.txt": { content },
      }
    }
    await this.publishGist(
      req, computation.gitHubAccessToken)
  }
}
