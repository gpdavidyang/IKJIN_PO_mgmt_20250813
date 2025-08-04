import { relations } from "drizzle-orm/relations";
import { purchaseOrders, attachments, users, emailSendingHistory, emailSendingDetails, orderTemplates, handsontableConfigs, invoices, itemReceipts, purchaseOrderItems, orderHistory, loginAuditLogs, itemCategories, projectMembers, projects, projectHistory, verificationLogs, templateFields, vendors, companies, approvalWorkflowSettings } from "./schema";

export const attachmentsRelations = relations(attachments, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [attachments.orderId],
		references: [purchaseOrders.id]
	}),
	user: one(users, {
		fields: [attachments.uploadedBy],
		references: [users.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	attachments: many(attachments),
	emailSendingHistories: many(emailSendingHistory),
	orderHistories: many(orderHistory),
	verificationLogs: many(verificationLogs),
	invoices: many(invoices),
	user_approvedBy: one(users, {
		fields: [purchaseOrders.approvedBy],
		references: [users.id],
		relationName: "purchaseOrders_approvedBy_users_id"
	}),
	project: one(projects, {
		fields: [purchaseOrders.projectId],
		references: [projects.id]
	}),
	orderTemplate: one(orderTemplates, {
		fields: [purchaseOrders.templateId],
		references: [orderTemplates.id]
	}),
	user_userId: one(users, {
		fields: [purchaseOrders.userId],
		references: [users.id],
		relationName: "purchaseOrders_userId_users_id"
	}),
	vendor: one(vendors, {
		fields: [purchaseOrders.vendorId],
		references: [vendors.id]
	}),
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	attachments: many(attachments),
	emailSendingHistories: many(emailSendingHistory),
	itemReceipts: many(itemReceipts),
	orderHistories: many(orderHistory),
	loginAuditLogs: many(loginAuditLogs),
	projectMembers_assignedBy: many(projectMembers, {
		relationName: "projectMembers_assignedBy_users_id"
	}),
	projectMembers_userId: many(projectMembers, {
		relationName: "projectMembers_userId_users_id"
	}),
	projectHistories: many(projectHistory),
	verificationLogs: many(verificationLogs),
	invoices_uploadedBy: many(invoices, {
		relationName: "invoices_uploadedBy_users_id"
	}),
	invoices_verifiedBy: many(invoices, {
		relationName: "invoices_verifiedBy_users_id"
	}),
	purchaseOrders_approvedBy: many(purchaseOrders, {
		relationName: "purchaseOrders_approvedBy_users_id"
	}),
	purchaseOrders_userId: many(purchaseOrders, {
		relationName: "purchaseOrders_userId_users_id"
	}),
	orderTemplates: many(orderTemplates),
	projects_orderManagerId: many(projects, {
		relationName: "projects_orderManagerId_users_id"
	}),
	projects_projectManagerId: many(projects, {
		relationName: "projects_projectManagerId_users_id"
	}),
	approvalWorkflowSettings: many(approvalWorkflowSettings),
}));

export const emailSendingDetailsRelations = relations(emailSendingDetails, ({one}) => ({
	emailSendingHistory: one(emailSendingHistory, {
		fields: [emailSendingDetails.historyId],
		references: [emailSendingHistory.id]
	}),
}));

export const emailSendingHistoryRelations = relations(emailSendingHistory, ({one, many}) => ({
	emailSendingDetails: many(emailSendingDetails),
	purchaseOrder: one(purchaseOrders, {
		fields: [emailSendingHistory.orderId],
		references: [purchaseOrders.id]
	}),
	user: one(users, {
		fields: [emailSendingHistory.senderUserId],
		references: [users.id]
	}),
}));

export const handsontableConfigsRelations = relations(handsontableConfigs, ({one}) => ({
	orderTemplate: one(orderTemplates, {
		fields: [handsontableConfigs.templateId],
		references: [orderTemplates.id]
	}),
}));

export const orderTemplatesRelations = relations(orderTemplates, ({one, many}) => ({
	handsontableConfigs: many(handsontableConfigs),
	templateFields: many(templateFields),
	purchaseOrders: many(purchaseOrders),
	user: one(users, {
		fields: [orderTemplates.createdBy],
		references: [users.id]
	}),
}));

export const itemReceiptsRelations = relations(itemReceipts, ({one, many}) => ({
	invoice: one(invoices, {
		fields: [itemReceipts.invoiceId],
		references: [invoices.id]
	}),
	purchaseOrderItem: one(purchaseOrderItems, {
		fields: [itemReceipts.orderItemId],
		references: [purchaseOrderItems.id]
	}),
	user: one(users, {
		fields: [itemReceipts.verifiedBy],
		references: [users.id]
	}),
	verificationLogs: many(verificationLogs),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	itemReceipts: many(itemReceipts),
	verificationLogs: many(verificationLogs),
	purchaseOrder: one(purchaseOrders, {
		fields: [invoices.orderId],
		references: [purchaseOrders.id]
	}),
	user_uploadedBy: one(users, {
		fields: [invoices.uploadedBy],
		references: [users.id],
		relationName: "invoices_uploadedBy_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [invoices.verifiedBy],
		references: [users.id],
		relationName: "invoices_verifiedBy_users_id"
	}),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({one, many}) => ({
	itemReceipts: many(itemReceipts),
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderItems.orderId],
		references: [purchaseOrders.id]
	}),
}));

export const orderHistoryRelations = relations(orderHistory, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [orderHistory.orderId],
		references: [purchaseOrders.id]
	}),
	user: one(users, {
		fields: [orderHistory.userId],
		references: [users.id]
	}),
}));

export const loginAuditLogsRelations = relations(loginAuditLogs, ({one}) => ({
	user: one(users, {
		fields: [loginAuditLogs.userId],
		references: [users.id]
	}),
}));

export const itemCategoriesRelations = relations(itemCategories, ({one, many}) => ({
	itemCategory: one(itemCategories, {
		fields: [itemCategories.parentId],
		references: [itemCategories.id],
		relationName: "itemCategories_parentId_itemCategories_id"
	}),
	itemCategories: many(itemCategories, {
		relationName: "itemCategories_parentId_itemCategories_id"
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [projectMembers.assignedBy],
		references: [users.id],
		relationName: "projectMembers_assignedBy_users_id"
	}),
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id]
	}),
	user_userId: one(users, {
		fields: [projectMembers.userId],
		references: [users.id],
		relationName: "projectMembers_userId_users_id"
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	projectMembers: many(projectMembers),
	projectHistories: many(projectHistory),
	purchaseOrders: many(purchaseOrders),
	user_orderManagerId: one(users, {
		fields: [projects.orderManagerId],
		references: [users.id],
		relationName: "projects_orderManagerId_users_id"
	}),
	user_projectManagerId: one(users, {
		fields: [projects.projectManagerId],
		references: [users.id],
		relationName: "projects_projectManagerId_users_id"
	}),
}));

export const projectHistoryRelations = relations(projectHistory, ({one}) => ({
	user: one(users, {
		fields: [projectHistory.changedBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projectHistory.projectId],
		references: [projects.id]
	}),
}));

export const verificationLogsRelations = relations(verificationLogs, ({one}) => ({
	invoice: one(invoices, {
		fields: [verificationLogs.invoiceId],
		references: [invoices.id]
	}),
	itemReceipt: one(itemReceipts, {
		fields: [verificationLogs.itemReceiptId],
		references: [itemReceipts.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [verificationLogs.orderId],
		references: [purchaseOrders.id]
	}),
	user: one(users, {
		fields: [verificationLogs.performedBy],
		references: [users.id]
	}),
}));

export const templateFieldsRelations = relations(templateFields, ({one}) => ({
	orderTemplate: one(orderTemplates, {
		fields: [templateFields.templateId],
		references: [orderTemplates.id]
	}),
}));

export const vendorsRelations = relations(vendors, ({many}) => ({
	purchaseOrders: many(purchaseOrders),
}));

export const approvalWorkflowSettingsRelations = relations(approvalWorkflowSettings, ({one}) => ({
	company: one(companies, {
		fields: [approvalWorkflowSettings.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [approvalWorkflowSettings.createdBy],
		references: [users.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	approvalWorkflowSettings: many(approvalWorkflowSettings),
}));