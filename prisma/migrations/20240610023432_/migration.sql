-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "metadataHash" TEXT,
    "proposalId" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isDraftCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "taskTaken" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT DEFAULT 'Individual',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsSearch" TEXT,
    "engineersRequirement" TEXT,
    "departament" TEXT,
    "deadline" TEXT,
    "description" TEXT,
    "title" TEXT,
    "file" TEXT,
    "links" TEXT[],
    "applications" TEXT NOT NULL DEFAULT '[]',
    "estimatedBudget" TEXT NOT NULL DEFAULT '0',
    "contributorsNeeded" TEXT NOT NULL DEFAULT '1',
    "contributors" TEXT[],
    "executor" TEXT,
    "projectLength" TEXT NOT NULL DEFAULT 'Less than 1 week',
    "metadataEdited" BOOLEAN NOT NULL DEFAULT false,
    "budgetIncreased" BOOLEAN NOT NULL DEFAULT false,
    "deadlineIncreased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isOpenmesh" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TEXT,
    "endDate" TEXT,
    "aragonMetadata" TEXT,
    "creator" TEXT,
    "manager" TEXT,
    "hasSpamLink" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draftVote" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "votingPower" TEXT NOT NULL DEFAULT '1',
    "voteOption" TEXT,
    "id_task" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "draftVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taskDraft" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "status" TEXT,
    "type" TEXT DEFAULT 'Individual',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsSearch" TEXT,
    "engineersRequirement" TEXT,
    "departament" TEXT,
    "deadline" TEXT,
    "description" TEXT,
    "title" TEXT,
    "file" TEXT,
    "links" TEXT[],
    "estimatedBudget" TEXT NOT NULL DEFAULT '0',
    "contributorsNeeded" TEXT NOT NULL DEFAULT '1',
    "contributors" TEXT[],
    "executor" TEXT,
    "projectLength" TEXT NOT NULL DEFAULT 'Less than 1 week',
    "startDate" TEXT,
    "endDate" TEXT,
    "aragonMetadata" TEXT,
    "hasSpamLink" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "taskDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departament" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "addressTaskDrafts" TEXT,
    "addressDAO" TEXT,
    "addressTokenListGovernance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "departament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifiedContributorToken" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT,
    "departamentList" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verifiedContributorToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentTaskDraft" (
    "id" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "decimals" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "paymentTaskDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "decimals" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "metadata" TEXT,
    "reward" TEXT[],
    "proposer" TEXT,
    "applicant" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "metadataDescription" TEXT,
    "metadataProposedBudget" TEXT,
    "metadataAdditionalLink" TEXT,
    "metadataDisplayName" TEXT,
    "timestamp" TEXT,
    "transactionHash" TEXT,
    "blockNumber" TEXT NOT NULL DEFAULT '0',
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicationOffChain" (
    "id" TEXT NOT NULL,
    "metadata" TEXT,
    "reward" TEXT[],
    "proposer" TEXT,
    "applicant" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "metadataDescription" TEXT,
    "metadataProposedBudget" TEXT,
    "metadataAdditionalLink" TEXT,
    "metadataDisplayName" TEXT,
    "openmeshExpertUserId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "offChain" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TEXT DEFAULT '1698253',
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "applicationOffChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "proposer" TEXT NOT NULL,
    "applicant" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "review" TEXT,
    "metadataDescription" TEXT,
    "metadataAdditionalLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadataReviewFeedback" TEXT,
    "metadataReview" TEXT,
    "timestampReview" TEXT,
    "executorReview" TEXT,
    "timestamp" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" TEXT NOT NULL DEFAULT '0',
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "eventIndex" TEXT,
    "transactionHash" TEXT,
    "blockNumber" TEXT NOT NULL DEFAULT '0',
    "taskId" TEXT,
    "address" TEXT,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "verifiedContributorToken" TEXT,
    "profilePictureHash" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joinedSince" TEXT,
    "updatesNonce" TEXT NOT NULL DEFAULT '0',
    "jobSuccess" TEXT,
    "totalEarned" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifiedContributorSubmission" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "githubLogin" TEXT,
    "githubHTMLUrl" TEXT,
    "githubId" TEXT,
    "githubName" TEXT,
    "githubEmail" TEXT,
    "githubAccessToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verifiedContributorSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakersRegistrationCalendly" (
    "id" TEXT NOT NULL,
    "uri" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "additionalInfo" TEXT,
    "eventName" TEXT,
    "eventAt" TIMESTAMP(3),
    "timezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reschedule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "speakersRegistrationCalendly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmeshExpertUser" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "web3Address" TEXT,
    "updatesNonce" TEXT NOT NULL DEFAULT '1',
    "equinixAPIKey" TEXT,
    "aivenAPIKey" TEXT,
    "aivenAPIServiceUriParams" TEXT,
    "validationCloudAPIKeyEthereum" TEXT,
    "validationCloudAPIKeyPolygon" TEXT,
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "foundingYear" INTEGER,
    "location" TEXT,
    "website" TEXT,
    "personalBlog" TEXT,
    "githubLink" TEXT,
    "tags" TEXT[],
    "description" TEXT,
    "scheduleCalendlyLink" TEXT,
    "profilePictureHash" TEXT,
    "walletAddress" TEXT,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCall" BOOLEAN NOT NULL DEFAULT false,
    "userEnabled" BOOLEAN NOT NULL DEFAULT true,
    "registrationByVerifiedContributor" BOOLEAN NOT NULL DEFAULT false,
    "confirmedEmail" BOOLEAN DEFAULT false,
    "hashConfirmEmail" TEXT,
    "registrationByOpenRD" BOOLEAN NOT NULL DEFAULT false,
    "timestampCodeEmail" TEXT,
    "pageRedirect" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshExpertUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmeshDataProviders" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "sql" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "company" TEXT,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "isThirdParty" BOOLEAN NOT NULL DEFAULT false,
    "dataSpace" TEXT NOT NULL DEFAULT '0 MB',
    "download" BOOLEAN NOT NULL DEFAULT false,
    "downloadCSVLink" TEXT NOT NULL DEFAULT '',
    "liveLink" TEXT NOT NULL DEFAULT 'wss://ws.tech.l3a.xyz',
    "website" TEXT,
    "addToXnodeMessage" TEXT NOT NULL DEFAULT 'Coming Soon',
    "location" TEXT,
    "foundingYear" TEXT,
    "relevantDocs" TEXT,
    "linkDevelopersDocs" TEXT,
    "linkProducts" TEXT,
    "linkCareers" TEXT,
    "linkTwitter" TEXT,
    "linkContact" TEXT,
    "linkAboutUs" TEXT,
    "linkMedium" TEXT,
    "linkLinkedin" TEXT,
    "linkGithub" TEXT,
    "type" TEXT NOT NULL DEFAULT 'data',
    "category" TEXT,
    "dataCloudName" TEXT,
    "dataCloudLink" TEXT,
    "logoURL" TEXT,
    "logoWithCompanyNameURL" TEXT,
    "dataGithubName" TEXT,
    "dataGithubLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshDataProviders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmeshTemplateProducts" (
    "id" TEXT NOT NULL,
    "providerName" TEXT,
    "productName" TEXT,
    "location" TEXT,
    "cpuCores" TEXT,
    "cpuThreads" TEXT,
    "cpuGHZ" TEXT,
    "hasSGX" BOOLEAN NOT NULL DEFAULT false,
    "ram" TEXT,
    "numberDrives" TEXT,
    "avgSizeDrive" TEXT,
    "storageTotal" TEXT,
    "gpuType" TEXT,
    "gpuMemory" TEXT,
    "bandwidthNetwork" TEXT,
    "network" TEXT,
    "priceHour" TEXT,
    "priceMonth" TEXT,
    "availability" TEXT,
    "source" TEXT,
    "unit" TEXT,
    "type" TEXT NOT NULL DEFAULT 'data',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshTemplateProducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openmeshTemplateData" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "price" TEXT,
    "logoUrl" TEXT,
    "tags" TEXT[],
    "systemMinRequirements" TEXT,
    "systemRecommendedRequirements" TEXT,
    "productsIncluded" TEXT[],
    "techDiagrams" TEXT,
    "source" TEXT DEFAULT 'openmesh',
    "category" TEXT DEFAULT 'validatorNode',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshTemplateData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templateDataProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "openmeshTemplateDataId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "templateDataProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recoverPassword" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "timeStamp" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "openmeshExpertUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "recoverPassword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xnode" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "useCase" TEXT,
    "status" TEXT,
    "type" TEXT,
    "location" TEXT,
    "consoleNodes" TEXT,
    "consoleEdges" TEXT,
    "validatorSignature" TEXT,
    "url1" TEXT,
    "url2" TEXT,
    "url3" TEXT,
    "url4" TEXT,
    "adoBuildTag" TEXT,
    "buildId" TEXT,
    "serverNumber" TEXT,
    "serverLoc" TEXT,
    "features" TEXT,
    "websocketEnabled" BOOLEAN NOT NULL DEFAULT false,
    "openmeshExpertUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "xnode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isUnit" BOOLEAN NOT NULL,
    "services" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "location" TEXT,
    "apiKey" TEXT,
    "accessToken" TEXT,
    "heartbeatData" TEXT,
    "nftId" TEXT NOT NULL,
    "openmeshExpertUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xnodeClaimActivities" (
    "id" TEXT NOT NULL,
    "wallet" TEXT,
    "amount" TEXT,
    "txStatus" TEXT,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "xnodeId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "xnodeClaimActivities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pythiaChat" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "openmeshExpertUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "pythiaChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pythiaInput" (
    "id" TEXT NOT NULL,
    "userMessage" TEXT,
    "response" TEXT,
    "badResponseFeedback" BOOLEAN NOT NULL DEFAULT false,
    "pythiaChatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "pythiaInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llmInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "urlEndpoint" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "llmInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_taskId_key" ON "task"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "task_proposalId_departament_key" ON "task"("proposalId", "departament");

-- CreateIndex
CREATE UNIQUE INDEX "draftVote_id_task_address_key" ON "draftVote"("id_task", "address");

-- CreateIndex
CREATE UNIQUE INDEX "taskDraft_proposalId_key" ON "taskDraft"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "departament_name_key" ON "departament"("name");

-- CreateIndex
CREATE UNIQUE INDEX "verifiedContributorToken_tokenId_key" ON "verifiedContributorToken"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "application_taskId_applicationId_key" ON "application"("taskId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_taskId_submissionId_key" ON "submission"("taskId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "event_eventIndex_transactionHash_blockNumber_key" ON "event"("eventIndex", "transactionHash", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_address_key" ON "user"("address");

-- CreateIndex
CREATE UNIQUE INDEX "openmeshExpertUser_email_key" ON "openmeshExpertUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "openmeshExpertUser_web3Address_key" ON "openmeshExpertUser"("web3Address");

-- CreateIndex
CREATE UNIQUE INDEX "recoverPassword_txid_key" ON "recoverPassword"("txid");

-- AddForeignKey
ALTER TABLE "draftVote" ADD CONSTRAINT "draftVote_id_task_fkey" FOREIGN KEY ("id_task") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiedContributorToken" ADD CONSTRAINT "verifiedContributorToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentTaskDraft" ADD CONSTRAINT "paymentTaskDraft_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "taskDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("taskId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicationOffChain" ADD CONSTRAINT "applicationOffChain_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicationOffChain" ADD CONSTRAINT "applicationOffChain_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("taskId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("taskId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiedContributorSubmission" ADD CONSTRAINT "verifiedContributorSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templateDataProduct" ADD CONSTRAINT "templateDataProduct_openmeshTemplateDataId_fkey" FOREIGN KEY ("openmeshTemplateDataId") REFERENCES "openmeshTemplateData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recoverPassword" ADD CONSTRAINT "recoverPassword_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xnode" ADD CONSTRAINT "xnode_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment" ADD CONSTRAINT "deployment_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xnodeClaimActivities" ADD CONSTRAINT "xnodeClaimActivities_xnodeId_fkey" FOREIGN KEY ("xnodeId") REFERENCES "xnode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xnodeClaimActivities" ADD CONSTRAINT "xnodeClaimActivities_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "deployment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pythiaChat" ADD CONSTRAINT "pythiaChat_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pythiaInput" ADD CONSTRAINT "pythiaInput_pythiaChatId_fkey" FOREIGN KEY ("pythiaChatId") REFERENCES "pythiaChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
