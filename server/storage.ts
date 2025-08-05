import {
  users,
  vendors,
  items,
  projects,
  projectMembers,
  projectHistory,
  purchaseOrders,
  purchaseOrderItems,
  attachments,
  orderHistory,
  invoices,
  itemReceipts,
  verificationLogs,
  orderTemplates,
  itemCategories,

  uiTerms,
  terminology,
  approvalAuthorities,
  userRoleEnum,

  companies,
  purchaseOrderStatusEnum,
  type User,
  type UpsertUser,
  type Vendor,
  type InsertVendor,
  type Item,
  type InsertItem,
  type Project,
  type InsertProject,
  projectMembers as projectMembersTable,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type Attachment,
  type InsertAttachment,
  type OrderHistory,
  type InsertOrderHistory,
  type Invoice,
  type InsertInvoice,
  type ItemReceipt,
  type InsertItemReceipt,
  type VerificationLog,
  type InsertVerificationLog,
  type OrderTemplate,
  type InsertOrderTemplate,
  type ItemCategory,
  type InsertItemCategory,
  // Order status types removed - using ENUM with views
  type UiTerm,
  type InsertUiTerm,
  type ApprovalAuthority,
  type InsertApprovalAuthority,

  type Company,
  type InsertCompany,
  type Terminology,
  type InsertTerminology,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, or, between, count, sum, sql, gte, lte, inArray, isNotNull, notInArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profile: { name?: string }): Promise<User>;
  
  // User management operations
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  toggleUserActive(id: string, isActive: boolean): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;
  
  // Project status and type operations
  getProjectStatuses(): Promise<any[]>;
  getProjectTypes(): Promise<any[]>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getActiveProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Order template operations
  getOrderTemplates(): Promise<OrderTemplate[]>;
  getOrderTemplate(id: number): Promise<OrderTemplate | undefined>;
  createOrderTemplate(template: InsertOrderTemplate): Promise<OrderTemplate>;
  updateOrderTemplate(id: number, template: Partial<InsertOrderTemplate>): Promise<OrderTemplate>;
  deleteOrderTemplate(id: number): Promise<void>;
  
  // Order status operations - using display view approach
  getOrderStatuses(): Promise<Array<{id: number, code: string, name: string, color: string, sortOrder: number}>>;
  
  // Item operations
  getItems(filters?: {
    category?: string;
    searchText?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: Item[], total: number }>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: number): Promise<void>;
  getCategories(): Promise<string[]>;
  
  // Purchase order operations
  getPurchaseOrders(filters?: {
    userId?: string;
    status?: string;
    vendorId?: number;
    startDate?: Date;
    endDate?: Date;
    searchText?: string;
    majorCategory?: string;
    middleCategory?: string;
    minorCategory?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: (PurchaseOrder & { vendor?: Vendor; user?: User; items?: PurchaseOrderItem[] })[], total: number }>;
  getPurchaseOrder(id: number): Promise<(PurchaseOrder & { vendor?: Vendor; user?: User; items?: PurchaseOrderItem[]; attachments?: Attachment[] }) | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, order: Partial<Omit<InsertPurchaseOrder, 'items'>>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: number): Promise<void>;
  approvePurchaseOrder(id: number, approvedBy: string): Promise<PurchaseOrder>;
  
  // Purchase order item operations
  createPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]>;
  updatePurchaseOrderItems(orderId: number, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]>;
  
  // Attachment operations
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachment(id: number): Promise<Attachment | undefined>;
  getOrderAttachments(orderId: number): Promise<Attachment[]>;
  deleteAttachment(id: number): Promise<void>;
  
  // Order history operations
  createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory>;
  getOrderHistory(orderId: number): Promise<OrderHistory[]>;
  
  // Statistics
  getDashboardStats(userId?: string): Promise<{
    totalOrders: number;
    monthlyOrders: number;
    pendingOrders: number;
    awaitingApprovalOrders: number;
    totalVendors: number;
  }>;
  
  // Monthly statistics
  getMonthlyOrderStats(userId?: string): Promise<Array<{
    month: string;
    orders: number;
    amount: number;
  }>>;
  
  // Vendor statistics
  getVendorOrderStats(userId?: string): Promise<Array<{
    vendorName: string;
    orders: number;
    amount: number;
  }>>;
  
  // Status statistics
  getStatusOrderStats(userId?: string): Promise<Array<{
    status: string;
    orders: number;
    amount: number;
  }>>;
  
  // Project statistics
  getProjectOrderStats(userId?: string): Promise<Array<{
    projectName: string;
    projectCode: string;
    orderCount: number;
    totalAmount: number;
  }>>;
  
  // Category statistics
  getCategoryOrderStats(userId?: string): Promise<Array<{
    majorCategory: string;
    middleCategory: string;
    minorCategory: string;
    orderCount: number;
    totalAmount: number;
  }>>;
  
  // Generate order number
  generateOrderNumber(): Promise<string>;
  
  // Invoice operations
  getInvoices(orderId?: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  verifyInvoice(id: number, verifiedBy: string): Promise<Invoice>;
  
  // Item receipt operations
  getItemReceipts(orderItemId?: number): Promise<ItemReceipt[]>;
  getItemReceipt(id: number): Promise<ItemReceipt | undefined>;
  createItemReceipt(receipt: InsertItemReceipt): Promise<ItemReceipt>;
  updateItemReceipt(id: number, receipt: Partial<InsertItemReceipt>): Promise<ItemReceipt>;
  deleteItemReceipt(id: number): Promise<void>;
  
  // Verification log operations
  getVerificationLogs(orderId?: number, invoiceId?: number): Promise<VerificationLog[]>;
  
  // UI terms operations
  getUiTerms(category?: string): Promise<UiTerm[]>;
  getUiTerm(termKey: string): Promise<UiTerm | undefined>;
  createUiTerm(term: InsertUiTerm): Promise<UiTerm>;
  updateUiTerm(termKey: string, term: Partial<InsertUiTerm>): Promise<UiTerm>;
  deleteUiTerm(termKey: string): Promise<void>;
  
  // Terminology operations
  getTerminology(): Promise<Terminology[]>;
  getTerm(id: number): Promise<Terminology | undefined>;
  createTerm(term: InsertTerminology): Promise<Terminology>;
  updateTerm(id: number, term: Partial<InsertTerminology>): Promise<Terminology>;
  deleteTerm(id: number): Promise<void>;
  

  
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  
  // Approval management operations
  getApprovalStats(): Promise<{
    pendingCount: number;
    urgentCount: number;
    averageWaitDays: number;
    pendingAmount: number;
  }>;
  getPendingApprovals(): Promise<PurchaseOrder[]>;
  getApprovalHistory(): Promise<PurchaseOrder[]>;
  getOrdersForApproval(role: string): Promise<PurchaseOrder[]>;
  approveOrder(orderId: number, approverId: string, note?: string): Promise<PurchaseOrder>;
  rejectOrder(orderId: number, rejectedBy: string, note?: string): Promise<PurchaseOrder>;
  
  // Project members operations
  getProjectMembers(projectId?: number): Promise<any[]>;
  createProjectMember(member: { projectId: number; userId: string; role: string }): Promise<any>;
  deleteProjectMember(id: number): Promise<void>;
  
  createVerificationLog(log: InsertVerificationLog): Promise<VerificationLog>;
  
  // Item Categories operations
  getItemCategories(): Promise<ItemCategory[]>;
  createItemCategory(category: InsertItemCategory): Promise<ItemCategory>;
  updateItemCategory(id: number, category: Partial<InsertItemCategory>): Promise<ItemCategory>;
  deleteItemCategory(id: number): Promise<void>;
  
  // Missing interface methods
  getMajorCategories(): Promise<ItemCategory[]>;
  getMiddleCategories(majorId?: number): Promise<ItemCategory[]>;
  getMinorCategories(middleId?: number): Promise<ItemCategory[]>;
  getPositions(): Promise<any[]>;
  
  // Item hierarchy methods for filters
  getDistinctMajorCategories(): Promise<string[]>;
  getDistinctMiddleCategories(majorCategory?: string): Promise<string[]>;
  getDistinctMinorCategories(majorCategory?: string, middleCategory?: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  // Generate standardized user ID
  private async generateStandardizedUserId(): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the highest sequence number for today
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.id} LIKE ${'USR_' + datePrefix + '_%'}`);
    
    let maxSequence = 0;
    for (const user of existingUsers) {
      const match = user.id.match(/USR_\d{8}_(\d{3})$/);
      if (match) {
        const sequence = parseInt(match[1], 10);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    }
    
    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    return `USR_${datePrefix}_${nextSequence}`;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by ID first, then by email
    let existingUser: User[] = [];
    
    if (userData.id) {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);
    } else if (userData.email) {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
    }

    if (existingUser.length > 0) {
      // Update existing user with all provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.phoneNumber !== undefined) updateData.phoneNumber = userData.phoneNumber;
      if (userData.role !== undefined) updateData.role = userData.role;

      if (userData.profileImageUrl !== undefined) updateData.profileImageUrl = userData.profileImageUrl;
      
      const whereCondition = userData.id ? eq(users.id, userData.id) : eq(users.email, userData.email!);
      
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(whereCondition)
        .returning();
      return user;
    }
    
    // Create new user with generated ID
    const userDataWithId = {
      ...userData,
      id: userData.id || await this.generateStandardizedUserId(),
    } as typeof users.$inferInsert;
    
    const [user] = await db
      .insert(users)
      .values(userDataWithId)
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profile: { name?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: "field_worker" | "project_manager" | "hq_management" | "executive" | "admin"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async toggleUserActive(id: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async checkUserReferences(id: string): Promise<{
    canDelete: boolean;
    references: {
      projects: Array<{ id: number; name: string; type: string }>;
      orders: Array<{ id: number; orderNumber: string }>;
    };
  }> {
    try {
      // Check projects where user is project manager
      const projectsAsManager = await db
        .select({
          id: projects.id,
          name: projects.projectName,
          type: sql<string>`'project_manager'`
        })
        .from(projects)
        .where(eq(projects.projectManagerId, id));

      // Check purchase orders created by user
      const ordersByUser = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber
        })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.userId, id));

      // Check project members
      const projectMemberships = await db
        .select({
          id: projects.id,
          name: projects.projectName,
          type: sql<string>`'project_member'`
        })
        .from(projectMembersTable)
        .leftJoin(projects, eq(projectMembersTable.projectId, projects.id))
        .where(eq(projectMembersTable.userId, id));

      // Check project members assigned by this user
      const projectMembersAssignedBy = await db
        .select({
          id: projects.id,
          name: projects.projectName,
          type: sql<string>`'assigned_by'`
        })
        .from(projectMembersTable)
        .leftJoin(projects, eq(projectMembersTable.projectId, projects.id))
        .where(eq(projectMembersTable.assignedBy, id));

      // Check project history changes made by this user
      const projectHistoryChanges = await db
        .select({
          id: projects.id,
          name: projects.projectName || sql<string>`'Unknown Project'`,
          type: sql<string>`'history_changed_by'`
        })
        .from(projectHistory)
        .leftJoin(projects, eq(projectHistory.projectId, projects.id))
        .where(eq(projectHistory.changedBy, id));

      const allProjects = [...projectsAsManager, ...projectMemberships, ...projectMembersAssignedBy, ...projectHistoryChanges]
        .filter(p => p.id !== null)
        .map(p => ({
          id: p.id as number,
          name: p.name || 'Unknown Project',
          type: p.type
        }));
      const canDelete = allProjects.length === 0 && ordersByUser.length === 0;

      return {
        canDelete,
        references: {
          projects: allProjects,
          orders: ordersByUser
        }
      };
    } catch (error) {
      console.error('Error checking user references:', error);
      return {
        canDelete: false,
        references: { projects: [], orders: [] }
      };
    }
  }

  async deleteUser(id: string): Promise<void> {
    // First check if user can be safely deleted
    const refCheck = await this.checkUserReferences(id);
    
    if (!refCheck.canDelete) {
      const errorDetails = [];
      if (refCheck.references.projects.length > 0) {
        errorDetails.push(`${refCheck.references.projects.length}개 프로젝트와 연결됨`);
      }
      if (refCheck.references.orders.length > 0) {
        errorDetails.push(`${refCheck.references.orders.length}개 발주서와 연결됨`);
      }
      
      throw new Error(`사용자를 삭제할 수 없습니다: ${errorDetails.join(', ')}`);
    }

    await db.delete(users).where(eq(users.id, id));
  }

  async reassignUserProjects(fromUserId: string, toUserId: string): Promise<void> {
    // Reassign projects where user is project manager
    await db
      .update(projects)
      .set({ projectManagerId: toUserId, updatedAt: new Date() })
      .where(eq(projects.projectManagerId, fromUserId));

    // Update project members assigned by this user to be assigned by the new user
    await db
      .update(projectMembersTable)
      .set({ assignedBy: toUserId, assignedAt: new Date() })
      .where(eq(projectMembersTable.assignedBy, fromUserId));

    // Update project history changes made by this user to be made by the new user
    await db
      .update(projectHistory)
      .set({ changedBy: toUserId })
      .where(eq(projectHistory.changedBy, fromUserId));

    // Remove from project members
    await db
      .delete(projectMembersTable)
      .where(eq(projectMembersTable.userId, fromUserId));
  }

  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(asc(vendors.name));
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor> {
    const [updatedVendor] = await db
      .update(vendors)
      .set({ ...vendor, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<void> {
    await db.update(vendors).set({ isActive: false }).where(eq(vendors.id, id));
  }

  // Order template operations
  async getOrderTemplates(): Promise<OrderTemplate[]> {
    return await db.select().from(orderTemplates).orderBy(asc(orderTemplates.templateName));
  }

  async getActiveOrderTemplates(): Promise<OrderTemplate[]> {
    return await db.select().from(orderTemplates).where(eq(orderTemplates.isActive, true)).orderBy(asc(orderTemplates.templateName));
  }

  async getOrderTemplate(id: number): Promise<OrderTemplate | undefined> {
    const [template] = await db.select().from(orderTemplates).where(eq(orderTemplates.id, id));
    return template;
  }

  async createOrderTemplate(template: InsertOrderTemplate): Promise<OrderTemplate> {
    const [newTemplate] = await db.insert(orderTemplates).values(template).returning();
    return newTemplate;
  }

  async updateOrderTemplate(id: number, template: Partial<InsertOrderTemplate>): Promise<OrderTemplate> {
    const [updatedTemplate] = await db
      .update(orderTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(orderTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteOrderTemplate(id: number): Promise<void> {
    await db.delete(orderTemplates).where(eq(orderTemplates.id, id));
  }

  async toggleOrderTemplateStatus(id: number, isActive: boolean): Promise<OrderTemplate> {
    const [updatedTemplate] = await db
      .update(orderTemplates)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(orderTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  // Note: Project status and type operations removed - using ENUM types directly for better performance

  // Project operations
  async getProjects(): Promise<any[]> {
    const projectList = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        clientName: projects.clientName,
        projectType: projects.projectType,
        location: projects.location,
        startDate: projects.startDate,
        endDate: projects.endDate,
        status: projects.status,
        totalBudget: projects.totalBudget,
        projectManagerId: projects.projectManagerId,
        orderManagerId: projects.orderManagerId,
        description: projects.description,
        isActive: projects.isActive,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Manager contact info from users table via foreign key
        projectManager: users.name,
        managerPhone: users.phoneNumber,
        managerEmail: users.email,
      })
      .from(projects)
      .leftJoin(users, eq(projects.projectManagerId, users.id))
      .where(eq(projects.isActive, true))
      .orderBy(desc(projects.createdAt));
    
    return projectList;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.update(projects).set({ isActive: false }).where(eq(projects.id, id));
  }

  // Order status operations - using display view approach
  async getOrderStatuses(): Promise<Array<{id: number, code: string, name: string, color: string, sortOrder: number}>> {
    const result = await db.execute(sql`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY sort_order) as id,
        status_code as code,
        status_name as name,
        status_color as color,
        sort_order as "sortOrder"
      FROM purchase_order_status_display
      ORDER BY sort_order
    `);
    return result.rows as Array<{id: number, code: string, name: string, color: string, sortOrder: number}>;
  }

  // Item operations
  async getItems(filters: {
    category?: string;
    searchText?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Item[], total: number }> {
    const {
      category,
      searchText,
      isActive = true,
      page = 1,
      limit = 50
    } = filters;

    let query = db.select({
      id: items.id,
      name: items.name,
      specification: items.specification,
      unit: items.unit,
      unitPrice: items.unitPrice,
      category: items.category,
      majorCategory: items.majorCategory,
      middleCategory: items.middleCategory,
      minorCategory: items.minorCategory,
      description: items.description,
      isActive: items.isActive,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    }).from(items);
    let countQuery = db.select({ count: count() }).from(items);

    const conditions: any[] = [];
    
    if (isActive !== undefined) {
      conditions.push(eq(items.isActive, isActive));
    }
    
    if (category) {
      conditions.push(eq(items.category, category));
    }
    
    if (searchText) {
      conditions.push(
        or(
          ilike(items.name, `%${searchText}%`),
          ilike(items.specification, `%${searchText}%`),
          ilike(items.description, `%${searchText}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query.orderBy(asc(items.name)).limit(limit).offset(offset);

    const [itemsResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      items: itemsResult,
      total: totalResult[0]?.count || 0
    };
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select({
      id: items.id,
      name: items.name,
      specification: items.specification,
      unit: items.unit,
      unitPrice: items.unitPrice,
      category: items.category,
      majorCategory: items.majorCategory,
      middleCategory: items.middleCategory,
      minorCategory: items.minorCategory,
      description: items.description,
      isActive: items.isActive,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    }).from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(itemData: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(itemData).returning();
    return item;
  }

  async updateItem(id: number, itemData: Partial<InsertItem>): Promise<Item> {
    const [item] = await db
      .update(items)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.update(items).set({ isActive: false }).where(eq(items.id, id));
  }

  async getCategories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: items.category })
      .from(items)
      .where(and(isNotNull(items.category), eq(items.isActive, true)))
      .orderBy(items.category);
    
    return result.map(row => row.category as string);
  }

  // Purchase order operations
  async getPurchaseOrders(filters: {
    userId?: string;
    status?: string;
    vendorId?: number;
    templateId?: number;
    projectId?: number;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    searchText?: string;
    majorCategory?: string;
    middleCategory?: string;
    minorCategory?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ orders: (PurchaseOrder & { vendor?: Vendor; user?: User; items?: PurchaseOrderItem[] })[], total: number }> {
    const { userId, status, vendorId, templateId, projectId, startDate, endDate, minAmount, maxAmount, searchText, majorCategory, middleCategory, minorCategory, page = 1, limit = 10 } = filters;
    
    let whereConditions = [];
    
    if (userId) {
      whereConditions.push(eq(purchaseOrders.userId, userId));
    }
    
    if (status) {
      whereConditions.push(sql`${purchaseOrders.status} = ${status}`);
    }
    
    if (vendorId) {
      whereConditions.push(eq(purchaseOrders.vendorId, vendorId));
    }
    
    if (templateId) {
      whereConditions.push(eq(purchaseOrders.templateId, templateId));
    }
    
    if (projectId) {
      whereConditions.push(eq(purchaseOrders.projectId, projectId));
    }
    
    if (startDate && endDate) {
      whereConditions.push(between(purchaseOrders.orderDate, startDate, endDate));
    }
    
    // Simple approach: get all orders first, then filter in memory for complex search
    let baseWhereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [{ count: totalCountResult }] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(baseWhereClause);
    
    // Get all orders that match basic filters (without search)
    let allOrders = await db
      .select({
        purchase_orders: purchaseOrders,
        vendors: vendors,
        users: users,
        order_templates: orderTemplates,
        projects: projects
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .leftJoin(orderTemplates, eq(purchaseOrders.templateId, orderTemplates.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(baseWhereClause)
      .orderBy(desc(purchaseOrders.createdAt));

    // If searchText exists, filter in memory
    let filteredOrders = allOrders;
    if (searchText) {
      // First get all order items to search in
      const allOrderItems = await db
        .select()
        .from(purchaseOrderItems);
      
      const orderItemsMap = new Map<number, any[]>();
      allOrderItems.forEach(item => {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, []);
        }
        orderItemsMap.get(item.orderId)!.push(item);
      });

      filteredOrders = allOrders.filter(orderRow => {
        const order = orderRow.purchase_orders;
        const vendor = orderRow.vendors;
        const items = orderItemsMap.get(order.id) || [];
        
        const searchLower = searchText.toLowerCase();
        
        // Search in order number
        if (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in vendor name
        if (vendor && vendor.name && vendor.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in notes
        if (order.notes && order.notes.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in item names
        for (const item of items) {
          if (item.itemName && item.itemName.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        
        return false;
      });
    }

    // Apply amount filtering if specified
    if (minAmount !== undefined || maxAmount !== undefined) {
      filteredOrders = filteredOrders.filter(orderRow => {
        const order = orderRow.purchase_orders;
        const totalAmount = parseFloat(order.totalAmount) || 0;
        
        if (minAmount !== undefined && totalAmount < minAmount) {
          return false;
        }
        
        if (maxAmount !== undefined && totalAmount > maxAmount) {
          return false;
        }
        
        return true;
      });
    }

    // Apply category filtering if specified
    if (majorCategory || middleCategory || minorCategory) {
      // Get all order items with matching categories
      const categoryConditions = [];
      
      if (majorCategory) {
        categoryConditions.push(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      
      if (middleCategory) {
        categoryConditions.push(eq(purchaseOrderItems.middleCategory, middleCategory));
      }
      
      if (minorCategory) {
        categoryConditions.push(eq(purchaseOrderItems.minorCategory, minorCategory));
      }
      
      const matchingItems = await db
        .select({ orderId: purchaseOrderItems.orderId })
        .from(purchaseOrderItems)
        .where(and(...categoryConditions))
        .groupBy(purchaseOrderItems.orderId);
      
      const matchingOrderIds = new Set(matchingItems.map(item => item.orderId));
      
      filteredOrders = filteredOrders.filter(orderRow => {
        return matchingOrderIds.has(orderRow.purchase_orders.id);
      });
    }

    // Apply pagination
    const totalCount = filteredOrders.length;
    const orders = filteredOrders.slice((page - 1) * limit, page * limit);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.orderId, order.purchase_orders.id));

        // 디버깅: 실제 DB 데이터 확인 (모든 발주서)
        console.log('🔍 DB에서 조회된 발주서 데이터:', {
          id: order.purchase_orders.id,
          orderNumber: order.purchase_orders.orderNumber,
          orderDate: order.purchase_orders.orderDate,
          deliveryDate: order.purchase_orders.deliveryDate,
          rawOrderDate: JSON.stringify(order.purchase_orders.orderDate),
          type: typeof order.purchase_orders.orderDate
        });

        return {
          ...order.purchase_orders,
          vendor: order.vendors || undefined,
          user: order.users || undefined,
          project: order.projects || undefined,
          projectName: order.projects?.projectName || 'Unknown Project',
          projectCode: order.projects?.projectCode || '',
          templateName: order.order_templates?.templateName || undefined,
          statusName: order.purchase_orders.status,
          items,
        };
      })
    );

    return {
      orders: ordersWithItems,
      total: totalCount,
    };
  }

  async getPurchaseOrder(id: number): Promise<(PurchaseOrder & { vendor?: Vendor; user?: User; project?: Project; items?: PurchaseOrderItem[]; attachments?: Attachment[] }) | undefined> {
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(eq(purchaseOrders.id, id));

    if (!order) return undefined;

    console.log('Debug: Order found:', order.purchase_orders);

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    console.log('Debug: Items found:', items);

    const orderAttachments = await db
      .select({
        id: attachments.id,
        orderId: attachments.orderId,
        originalName: attachments.originalName,
        storedName: attachments.storedName,
        filePath: attachments.filePath,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        uploadedBy: attachments.uploadedBy,
        uploadedAt: attachments.uploadedAt,
      })
      .from(attachments)
      .where(eq(attachments.orderId, id));

    console.log('Debug: Attachments found:', orderAttachments);

    const result = {
      ...order.purchase_orders,
      vendor: order.vendors || undefined,
      user: order.users || undefined,
      project: order.projects || undefined,
      items,
      attachments: orderAttachments,
    };

    console.log('Debug: Final result:', result);
    console.log('Debug: Final result items:', result.items);

    return result;
  }

  async createPurchaseOrder(orderData: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const { items, ...order } = orderData;
    
    // Generate order number
    const orderNumber = await this.generateOrderNumber();
    
    // Calculate first approver based on amount and start workflow
    const orderAmount = order.totalAmount || 0;
    const nextApprover = await this.calculateNextApprover(orderAmount, 1);
    
    const orderWithWorkflow = {
      ...order,
      orderNumber,
      status: nextApprover ? 'pending' : 'approved',
      currentApproverRole: nextApprover,
      approvalLevel: 1
    };
    
    const [newOrder] = await db
      .insert(purchaseOrders)
      .values(orderWithWorkflow)
      .returning();

    // Insert order items
    if (items && items.length > 0) {
      await this.createPurchaseOrderItems(
        items.map(item => ({ 
          ...item, 
          orderId: newOrder.id
        }))
      );
    }

    // Create history entry
    await this.createOrderHistory({
      orderId: newOrder.id,
      userId: order.userId,
      action: "created",
      changes: { 
        order: newOrder,
        approvalRequired: !!nextApprover,
        nextApprover
      },
    });

    return newOrder;
  }

  async updatePurchaseOrder(id: number, orderData: Partial<Omit<InsertPurchaseOrder, 'items'>>): Promise<PurchaseOrder> {
    const [updatedOrder] = await db
      .update(purchaseOrders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();

    // Create history entry
    await this.createOrderHistory({
      orderId: id,
      userId: updatedOrder.userId,
      action: "updated",
      changes: { changes: orderData },
    });

    return updatedOrder;
  }

  async recalculateOrderTotal(orderId: number): Promise<void> {
    // Get all items for this order
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, orderId));

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);



    // Update the order total
    await db
      .update(purchaseOrders)
      .set({ 
        totalAmount: totalAmount.toString(),
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));
  }

  async deletePurchaseOrder(id: number): Promise<void> {
    const order = await this.getPurchaseOrder(id);
    if (!order) return;

    // Delete related records
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
    await db.delete(attachments).where(eq(attachments.orderId, id));
    await db.delete(orderHistory).where(eq(orderHistory.orderId, id));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async approvePurchaseOrder(id: number, approvedBy: string): Promise<PurchaseOrder> {
    const [approvedOrder] = await db
      .update(purchaseOrders)
      .set({
        isApproved: true,
        approvedBy,
        approvedAt: new Date(),
        status: sql`'approved'::purchase_order_status`,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();

    // Create history entry
    await this.createOrderHistory({
      orderId: id,
      userId: approvedBy,
      action: "approved",
      changes: { approvedBy, approvedAt: new Date() },
    });

    return approvedOrder;
  }

  // Purchase order item operations
  async createPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]> {
    if (items.length === 0) return [];
    return await db.insert(purchaseOrderItems).values(items).returning();
  }

  async updatePurchaseOrderItems(orderId: number, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderItem[]> {
    // Delete existing items
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
    
    // Insert new items
    if (items.length === 0) return [];
    return await db.insert(purchaseOrderItems).values(items).returning();
  }

  // Attachment operations
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    console.log('💎💎💎 CREATE ATTACHMENT CALLED 💎💎💎', attachment.originalName);
    
    // Fix Korean filename encoding before saving
    if (attachment.originalName) {
      console.log('💎💎💎 BEFORE DECODE 💎💎💎', attachment.originalName);
      attachment.originalName = this.decodeKoreanFilename(attachment.originalName);
      console.log('💎💎💎 AFTER DECODE 💎💎💎', attachment.originalName);
    }
    
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  // Korean filename decoder
  private decodeKoreanFilename(originalName: string): string {
    console.log('🔧🔧🔧 KOREAN FILENAME FIX START 🔧🔧🔧', originalName);
    
    try {
      // Method 1: Buffer from latin1 to utf8 (most common issue)
      const latin1Buffer = Buffer.from(originalName, 'latin1');
      const utf8Decoded = latin1Buffer.toString('utf8');
      if (/[가-힣]/.test(utf8Decoded)) {
        console.log('✅ Fixed Korean filename:', utf8Decoded);
        return utf8Decoded;
      }
    } catch (e) {
      console.log('❌ Method 1 failed:', e);
    }

    try {
      // Method 2: Double encoding fix
      const doubleDecoded = decodeURIComponent(escape(originalName));
      if (/[가-힣]/.test(doubleDecoded)) {
        console.log('✅ Fixed Korean filename (method 2):', doubleDecoded);
        return doubleDecoded;
      }
    } catch (e) {
      console.log('❌ Method 2 failed:', e);
    }

    try {
      // Method 3: Binary reinterpretation
      const binaryDecoded = Buffer.from(originalName, 'binary').toString('utf8');
      if (/[가-힣]/.test(binaryDecoded)) {
        console.log('✅ Fixed Korean filename (method 3):', binaryDecoded);
        return binaryDecoded;
      }
    } catch (e) {
      console.log('❌ Method 3 failed:', e);
    }

    console.log('❌ Could not fix Korean filename, using original');
    return originalName;
  }

  async getAttachment(id: number): Promise<Attachment | undefined> {
    const [attachment] = await db.select({
      id: attachments.id,
      orderId: attachments.orderId,
      originalName: attachments.originalName,
      storedName: attachments.storedName,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploadedAt: attachments.uploadedAt,
    }).from(attachments).where(eq(attachments.id, id));
    return attachment || undefined;
  }

  async getOrderAttachments(orderId: number): Promise<Attachment[]> {
    return await db.select({
      id: attachments.id,
      orderId: attachments.orderId,
      originalName: attachments.originalName,
      storedName: attachments.storedName,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploadedAt: attachments.uploadedAt,
    }).from(attachments).where(eq(attachments.orderId, orderId));
  }

  async deleteAttachment(id: number): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Order history operations
  async createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory> {
    const [newHistory] = await db.insert(orderHistory).values(history).returning();
    return newHistory;
  }

  async getOrderHistory(orderId: number): Promise<OrderHistory[]> {
    return await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(desc(orderHistory.createdAt));
  }

  // Statistics
  async getDashboardStats(userId?: string): Promise<{
    totalOrders: number;
    monthlyOrders: number;
    yearlyOrders: number;
    monthlyAmount: number;
    pendingOrders: number;
    awaitingApprovalOrders: number;
    totalVendors: number;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    
    let whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;
    
    const [totalOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(whereClause);

    const [monthlyOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        userId 
          ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfMonth))
          : gte(purchaseOrders.orderDate, firstDayOfMonth)
      );

    const [yearlyOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        userId 
          ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfYear))
          : gte(purchaseOrders.orderDate, firstDayOfYear)
      );

    const [monthlyAmountResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)` })
      .from(purchaseOrders)
      .where(
        userId 
          ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfMonth))
          : gte(purchaseOrders.orderDate, firstDayOfMonth)
      );

    const [pendingOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        userId
          ? and(eq(purchaseOrders.userId, userId), sql`${purchaseOrders.status} = 'pending'`)
          : sql`${purchaseOrders.status} = 'pending'`
      );

    const [totalVendors] = await db
      .select({ count: count() })
      .from(vendors)
      .where(eq(vendors.isActive, true));

    // 승인 대기 발주서 수 (draft 상태)
    const [awaitingApprovalOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        userId
          ? and(eq(purchaseOrders.userId, userId), sql`${purchaseOrders.status} = 'pending'`)
          : sql`${purchaseOrders.status} = 'pending'`
      );

    return {
      totalOrders: totalOrders.count,
      monthlyOrders: monthlyOrders.count,
      yearlyOrders: yearlyOrders.count,
      monthlyAmount: monthlyAmountResult.total,
      pendingOrders: pendingOrders.count,
      awaitingApprovalOrders: awaitingApprovalOrders.count,
      totalVendors: totalVendors.count,
    };
  }

  async getMonthlyOrderStats(userId?: string): Promise<Array<{
    month: string;
    orders: number;
    amount: number;
  }>> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const orders = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.orderDate, sixMonthsAgo),
          userId ? eq(purchaseOrders.userId, userId) : undefined
        )
      );

    // Group by month using JavaScript
    const monthlyData = new Map<string, { orders: number; amount: number }>();
    
    orders.forEach(order => {
      const month = order.orderDate.toISOString().substring(0, 7); // YYYY-MM format
      const existing = monthlyData.get(month) || { orders: 0, amount: 0 };
      monthlyData.set(month, {
        orders: existing.orders + 1,
        amount: existing.amount + Number(order.totalAmount)
      });
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        orders: data.orders,
        amount: data.amount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getVendorOrderStats(userId?: string): Promise<Array<{
    vendorName: string;
    orders: number;
    amount: number;
  }>> {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;
    
    const results = await db
      .select({
        vendorName: vendors.name,
        orders: count(purchaseOrders.id).as('orders'),
        amount: sum(purchaseOrders.totalAmount).as('amount')
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(whereClause)
      .groupBy(vendors.name)
      .orderBy(desc(count(purchaseOrders.id)))
      .limit(10);

    return results.map(row => ({
      vendorName: row.vendorName || '알 수 없음',
      orders: Number(row.orders),
      amount: Number(row.amount) || 0
    }));
  }

  async getStatusOrderStats(userId?: string): Promise<Array<{
    status: string;
    orders: number;
    amount: number;
  }>> {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;
    
    const results = await db
      .select({
        status: purchaseOrders.status,
        orders: count(purchaseOrders.id).as('orders'),
        amount: sum(purchaseOrders.totalAmount).as('amount')
      })
      .from(purchaseOrders)
      .where(whereClause)
      .groupBy(purchaseOrders.status)
      .orderBy(desc(count(purchaseOrders.id)));

    return results.map(row => ({
      status: row.status,
      orders: Number(row.orders),
      amount: Number(row.amount) || 0
    }));
  }

  async getProjectOrderStats(userId?: string): Promise<Array<{
    projectName: string;
    projectCode: string;
    orderCount: number;
    totalAmount: number;
  }>> {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;
    
    const results = await db
      .select({
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        orderCount: count(purchaseOrders.id).as('orderCount'),
        totalAmount: sum(purchaseOrders.totalAmount).as('totalAmount')
      })
      .from(purchaseOrders)
      .innerJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(whereClause)
      .groupBy(projects.id, projects.projectName, projects.projectCode)
      .orderBy(desc(count(purchaseOrders.id)));

    return results.map(row => ({
      projectName: row.projectName,
      projectCode: row.projectCode,
      orderCount: Number(row.orderCount),
      totalAmount: Number(row.totalAmount) || 0
    }));
  }

  // Generate order number
  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    
    const [lastOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(ilike(purchaseOrders.orderNumber, `${prefix}%`))
      .orderBy(desc(purchaseOrders.orderNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2] || "0");
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // Invoice operations
  async getInvoices(orderId?: number): Promise<Invoice[]> {
    const query = db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));

    if (orderId) {
      return await query.where(eq(invoices.orderId, orderId));
    }

    return await query;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    
    // Create verification log
    await this.createVerificationLog({
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      action: "invoice_uploaded",
      details: `청구서 ${invoice.invoiceNumber} 업로드됨`,
      performedBy: invoice.uploadedBy,
    });

    return invoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async verifyInvoice(id: number, verifiedBy: string): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({
        status: "verified",
        verifiedBy,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    // Create verification log
    await this.createVerificationLog({
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      action: "invoice_verified",
      details: `청구서 ${invoice.invoiceNumber} 검증 완료`,
      performedBy: verifiedBy,
    });

    return invoice;
  }

  // Item receipt operations
  async getItemReceipts(orderItemId?: number): Promise<ItemReceipt[]> {
    const query = db
      .select()
      .from(itemReceipts)
      .orderBy(desc(itemReceipts.createdAt));

    if (orderItemId) {
      return await query.where(eq(itemReceipts.orderItemId, orderItemId));
    }

    return await query;
  }

  async getItemReceipt(id: number): Promise<ItemReceipt | undefined> {
    const [receipt] = await db
      .select()
      .from(itemReceipts)
      .where(eq(itemReceipts.id, id));
    return receipt;
  }

  async createItemReceipt(receiptData: InsertItemReceipt): Promise<ItemReceipt> {
    const [receipt] = await db
      .insert(itemReceipts)
      .values(receiptData)
      .returning();

    // Get order item to find order ID
    const [orderItem] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, receipt.orderItemId));

    if (orderItem) {
      // Create verification log
      await this.createVerificationLog({
        orderId: orderItem.orderId,
        itemReceiptId: receipt.id,
        invoiceId: receipt.invoiceId,
        action: "item_received",
        details: `항목 수령 확인: ${receipt.receivedQuantity}개`,
        performedBy: receipt.verifiedBy,
      });
    }

    return receipt;
  }

  async updateItemReceipt(id: number, receiptData: Partial<InsertItemReceipt>): Promise<ItemReceipt> {
    const [receipt] = await db
      .update(itemReceipts)
      .set({ ...receiptData, updatedAt: new Date() })
      .where(eq(itemReceipts.id, id))
      .returning();
    return receipt;
  }

  async deleteItemReceipt(id: number): Promise<void> {
    await db.delete(itemReceipts).where(eq(itemReceipts.id, id));
  }

  // Verification log operations
  async getVerificationLogs(orderId?: number, invoiceId?: number): Promise<VerificationLog[]> {
    const conditions = [];
    if (orderId) conditions.push(eq(verificationLogs.orderId, orderId));
    if (invoiceId) conditions.push(eq(verificationLogs.invoiceId, invoiceId));

    if (conditions.length > 0) {
      return await db
        .select()
        .from(verificationLogs)
        .where(and(...conditions))
        .orderBy(desc(verificationLogs.createdAt));
    }

    return await db
      .select()
      .from(verificationLogs)
      .orderBy(desc(verificationLogs.createdAt));
  }

  async createVerificationLog(logData: InsertVerificationLog): Promise<VerificationLog> {
    const [log] = await db
      .insert(verificationLogs)
      .values(logData)
      .returning();
    return log;
  }

  // UI terms operations
  async getUiTerms(category?: string): Promise<UiTerm[]> {
    try {
      if (category) {
        return await db
          .select()
          .from(uiTerms)
          .where(and(eq(uiTerms.category, category), eq(uiTerms.isActive, true)))
          .orderBy(asc(uiTerms.termKey));
      }
      
      return await db
        .select()
        .from(uiTerms)
        .where(eq(uiTerms.isActive, true))
        .orderBy(asc(uiTerms.termKey));
    } catch (error) {
      console.error('Database error in getUiTerms:', error);
      // Return empty array if table doesn't exist or has structure issues
      return [];
    }
  }

  async getUiTerm(termKey: string): Promise<UiTerm | undefined> {
    const [term] = await db
      .select()
      .from(uiTerms)
      .where(and(eq(uiTerms.termKey, termKey), eq(uiTerms.isActive, true)));
    return term;
  }

  async createUiTerm(termData: InsertUiTerm): Promise<UiTerm> {
    const [term] = await db
      .insert(uiTerms)
      .values(termData)
      .returning();
    return term;
  }

  async updateUiTerm(termKey: string, termData: Partial<InsertUiTerm>): Promise<UiTerm> {
    const [term] = await db
      .update(uiTerms)
      .set({ ...termData, updatedAt: new Date() })
      .where(eq(uiTerms.termKey, termKey))
      .returning();
    return term;
  }

  async deleteUiTerm(termKey: string): Promise<void> {
    await db
      .update(uiTerms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(uiTerms.termKey, termKey));
  }

  // Terminology operations
  async getTerminology(): Promise<Terminology[]> {
    return await db
      .select()
      .from(terminology)
      .orderBy(asc(terminology.category), asc(terminology.termKey));
  }

  async getTerm(id: number): Promise<Terminology | undefined> {
    const [term] = await db
      .select()
      .from(terminology)
      .where(eq(terminology.id, id));
    return term || undefined;
  }

  async createTerm(termData: InsertTerminology): Promise<Terminology> {
    const [term] = await db
      .insert(terminology)
      .values(termData)
      .returning();
    return term;
  }

  async updateTerm(id: number, termData: Partial<InsertTerminology>): Promise<Terminology> {
    const [term] = await db
      .update(terminology)
      .set({ ...termData, updatedAt: new Date() })
      .where(eq(terminology.id, id))
      .returning();
    return term;
  }

  async deleteTerm(id: number): Promise<void> {
    await db
      .delete(terminology)
      .where(eq(terminology.id, id));
  }



  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.isActive, true))
      .orderBy(asc(companies.companyName));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.isActive, true)));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ...companyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return company;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...companyData, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async deleteCompany(id: number): Promise<void> {
    await db
      .update(companies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companies.id, id));
  }

  // Enhanced dashboard statistics
  async getActiveProjectsCount(userId?: string): Promise<number> {
    try {
      const conditions = [
        eq(projects.isActive, true),
        eq(projects.status, 'active')
      ];

      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(...conditions));

      return Number(result.count);
    } catch (error) {
      console.error('Error getting active projects count:', error);
      return 0;
    }
  }

  async getNewProjectsThisMonth(userId?: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const conditions = [
        eq(projects.isActive, true),
        gte(projects.startDate, startOfMonth)
      ];

      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(...conditions));

      return Number(result.count);
    } catch (error) {
      console.error('Error getting new projects this month:', error);
      return 0;
    }
  }

  async getRecentProjectsThisMonth(userId?: string): Promise<any[]> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const conditions = [
        eq(projects.isActive, true),
        gte(projects.startDate, startOfMonth)
      ];

      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }

      return await db
        .select({
          id: projects.id,
          projectName: projects.projectName,
          projectCode: projects.projectCode,
          startDate: projects.startDate,
          status: projects.status,
          clientName: projects.clientName
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.startDate))
        .limit(10);
    } catch (error) {
      console.error('Error getting recent projects this month:', error);
      return [];
    }
  }

  async getUrgentOrders(userId?: string): Promise<any[]> {
    try {
      const today = new Date();
      const urgentDate = new Date();
      urgentDate.setDate(today.getDate() + 7); // 7일 이내 배송 예정

      const conditions = [
        lte(purchaseOrders.deliveryDate, urgentDate),
        gte(purchaseOrders.deliveryDate, today),
        notInArray(purchaseOrders.status, ['completed'])
      ];

      if (userId) {
        conditions.push(eq(purchaseOrders.userId, userId));
      }

      return await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          requestedDeliveryDate: purchaseOrders.deliveryDate,
          totalAmount: purchaseOrders.totalAmount,
          status: purchaseOrders.status,
          vendorId: purchaseOrders.vendorId
        })
        .from(purchaseOrders)
        .where(and(...conditions))
        .orderBy(asc(purchaseOrders.deliveryDate))
        .limit(10);
    } catch (error) {
      console.error('Error getting urgent orders:', error);
      return [];
    }
  }

  // Project status and type methods
  async getProjectStatuses(): Promise<any[]> {
    try {
      return [
        { id: 'active', name: '진행중', code: 'active' },
        { id: 'completed', name: '완료', code: 'completed' },
        { id: 'on_hold', name: '보류', code: 'on_hold' },
        { id: 'cancelled', name: '취소', code: 'cancelled' }
      ];
    } catch (error) {
      console.error('Error getting project statuses:', error);
      return [];
    }
  }

  async getProjectTypes(): Promise<any[]> {
    try {
      return [
        { id: 'commercial', name: '상업시설', code: 'commercial' },
        { id: 'residential', name: '주거시설', code: 'residential' },
        { id: 'industrial', name: '산업시설', code: 'industrial' },
        { id: 'infrastructure', name: '인프라', code: 'infrastructure' }
      ];
    } catch (error) {
      console.error('Error getting project types:', error);
      return [];
    }
  }

  // Project members operations
  async getProjectMembers(projectId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: projectMembersTable.id,
          projectId: projectMembersTable.projectId,
          userId: projectMembersTable.userId,
          role: projectMembersTable.role,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          }
        })
        .from(projectMembersTable)
        .leftJoin(users, eq(projectMembersTable.userId, users.id));

      if (projectId) {
        query = query.where(eq(projectMembersTable.projectId, projectId));
      }

      return await query;
    } catch (error) {
      console.error('Error getting project members:', error);
      return [];
    }
  }

  async createProjectMember(member: { projectId: number; userId: string; role: string }): Promise<any> {
    try {
      const [newMember] = await db.insert(projectMembersTable).values(member).returning();
      return newMember;
    } catch (error) {
      console.error('Error creating project member:', error);
      throw error;
    }
  }

  async deleteProjectMember(id: number): Promise<void> {
    try {
      await db.delete(projectMembersTable).where(eq(projectMembersTable.id, id));
    } catch (error) {
      console.error('Error deleting project member:', error);
      throw error;
    }
  }

  // Approval management methods
  async getApprovalStats(): Promise<{
    pendingCount: number;
    urgentCount: number;
    averageWaitDays: number;
    pendingAmount: number;
  }> {
    try {
      // Get pending orders
      const pendingOrders = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'pending'));

      const pendingCount = pendingOrders.length;
      
      // Calculate urgent orders (pending for more than 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const urgentCount = pendingOrders.filter(order => 
        order.createdAt && new Date(order.createdAt) < threeDaysAgo
      ).length;

      // Calculate average wait days
      const waitDays = pendingOrders
        .filter(order => order.createdAt)
        .map(order => {
          const diffTime = Math.abs(new Date().getTime() - new Date(order.createdAt!).getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });
      
      const averageWaitDays = waitDays.length > 0 
        ? Math.round(waitDays.reduce((a, b) => a + b, 0) / waitDays.length)
        : 0;

      // Calculate total pending amount
      const pendingAmount = pendingOrders.reduce((total, order) => total + order.totalAmount, 0);

      return {
        pendingCount,
        urgentCount,
        averageWaitDays,
        pendingAmount
      };
    } catch (error) {
      console.error('Error getting approval stats:', error);
      throw error;
    }
  }

  async getPendingApprovals(userRole?: string, userId?: string): Promise<PurchaseOrder[]> {
    try {
      let query = db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'pending'))
        .orderBy(asc(purchaseOrders.createdAt));

      // 역할별 필터링 로직 (필요시 추가)
      return await query;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  async getApprovalHistory(): Promise<PurchaseOrder[]> {
    try {
      return await db
        .select()
        .from(purchaseOrders)
        .where(or(
          eq(purchaseOrders.status, 'approved'),
          eq(purchaseOrders.status, 'completed'),
          eq(purchaseOrders.status, 'sent')
        ))
        .orderBy(desc(purchaseOrders.updatedAt))
        .limit(50);
    } catch (error) {
      console.error('Error getting approval history:', error);
      throw error;
    }
  }

  async getOrdersForApproval(role: string): Promise<PurchaseOrder[]> {
    try {
      return await db
        .select()
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.status, 'pending'),
          eq(purchaseOrders.currentApproverRole, role)
        ))
        .orderBy(desc(purchaseOrders.orderDate));
    } catch (error) {
      console.error('Error getting orders for approval:', error);
      throw error;
    }
  }

  async approveOrder(orderId: number, approverId: string, note?: string): Promise<PurchaseOrder> {
    try {
      const [updatedOrder] = await db
        .update(purchaseOrders)
        .set({
          status: 'approved',
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId))
        .returning();

      // Log the approval action
      await db.insert(orderHistory).values({
        orderId,
        userId: approverId,
        action: 'approved',
        notes: note || '발주서가 승인되었습니다.',
        timestamp: new Date()
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error approving order:', error);
      throw error;
    }
  }

  async rejectOrder(orderId: number, rejectedBy: string, note?: string): Promise<PurchaseOrder> {
    try {
      const [updatedOrder] = await db
        .update(purchaseOrders)
        .set({
          status: 'draft',
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId))
        .returning();

      // Log the rejection action
      await db.insert(orderHistory).values({
        orderId,
        userId: rejectedBy,
        action: 'rejected',
        notes: note || '발주서가 반려되었습니다.',
        timestamp: new Date()
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error rejecting order:', error);
      throw error;
    }
  }

  // Approval authority management methods
  async getApprovalAuthorities(): Promise<ApprovalAuthority[]> {
    try {
      return await db
        .select()
        .from(approvalAuthorities)
        .where(eq(approvalAuthorities.isActive, true))
        .orderBy(asc(approvalAuthorities.role));
    } catch (error) {
      console.error('Error getting approval authorities:', error);
      throw error;
    }
  }

  // Order approval workflow methods
  async getOrdersForApproval(userRole: string): Promise<PurchaseOrder[]> {
    try {
      const orders = await db
        .select()
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.status, 'pending'),
          eq(purchaseOrders.currentApproverRole, userRole as any)
        ))
        .orderBy(desc(purchaseOrders.createdAt));
      
      return orders;
    } catch (error) {
      console.error('Error getting orders for approval:', error);
      throw error;
    }
  }

  async approveOrderWorkflow(orderId: number, userId: string): Promise<PurchaseOrder> {
    try {
      const order = await this.getPurchaseOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate next approver
      const nextApprover = await this.calculateNextApprover(order.totalAmount || 0, order.approvalLevel || 1);
      
      const updateData: any = {
        updatedAt: new Date(),
        approvalLevel: (order.approvalLevel || 1) + 1
      };

      if (nextApprover) {
        updateData.currentApproverRole = nextApprover;
      } else {
        // Final approval - order completed
        updateData.status = 'approved';
        updateData.currentApproverRole = null;
        updateData.isApproved = true;
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      }

      const [updatedOrder] = await db
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, orderId))
        .returning();

      // Log the approval action
      await db.insert(orderHistory).values({
        orderId,
        userId,
        action: nextApprover ? 'approved_partial' : 'approved_final',
        notes: nextApprover ? '단계별 승인 완료' : '최종 승인 완료',
        timestamp: new Date()
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error in approval workflow:', error);
      throw error;
    }
  }

  async calculateNextApprover(amount: number, currentLevel: number): Promise<string | null> {
    try {
      const authorities = await this.getApprovalAuthorities();
      
      // Sort by max amount in ascending order
      const sortedAuthorities = authorities
        .filter(auth => parseFloat(auth.maxAmount) >= amount)
        .sort((a, b) => parseFloat(a.maxAmount) - parseFloat(b.maxAmount));

      // Check if we need more approvals based on amount and level
      if (currentLevel >= sortedAuthorities.length) {
        return null; // No more approvals needed
      }

      // Return next required role
      return sortedAuthorities[currentLevel]?.role || null;
    } catch (error) {
      console.error('Error calculating next approver:', error);
      return null;
    }
  }

  async createApprovalAuthority(data: InsertApprovalAuthority): Promise<ApprovalAuthority> {
    try {
      const [authority] = await db
        .insert(approvalAuthorities)
        .values(data)
        .returning();
      return authority;
    } catch (error) {
      console.error('Error creating approval authority:', error);
      throw error;
    }
  }

  async updateApprovalAuthority(role: string, data: Partial<InsertApprovalAuthority>): Promise<ApprovalAuthority> {
    try {
      const [authority] = await db
        .update(approvalAuthorities)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(approvalAuthorities.role, role as any))
        .returning();
      return authority;
    } catch (error) {
      console.error('Error updating approval authority:', error);
      throw error;
    }
  }

  async canUserApproveOrder(userId: string, userRole: string, orderAmount: number): Promise<boolean> {
    try {
      // 시스템 관리자는 항상 승인 가능
      if (userRole === 'admin') {
        return true;
      }

      // 해당 역할의 승인 권한 조회
      const [authority] = await db
        .select()
        .from(approvalAuthorities)
        .where(and(
          eq(approvalAuthorities.role, userRole as any),
          eq(approvalAuthorities.isActive, true)
        ));

      if (!authority) {
        return false;
      }

      // 승인 권한 금액과 발주 금액 비교
      return parseFloat(authority.maxAmount) >= orderAmount;
    } catch (error) {
      console.error('Error checking user approval authority:', error);
      return false;
    }
  }



  // Item Categories Management
  async getItemCategories(): Promise<ItemCategory[]> {
    try {
      return await db
        .select()
        .from(itemCategories)
        .where(eq(itemCategories.isActive, true))
        .orderBy(itemCategories.categoryType, itemCategories.displayOrder);
    } catch (error) {
      console.error('Error getting item categories:', error);
      throw error;
    }
  }

  async getItemCategoriesByType(type: 'major' | 'middle' | 'minor', parentId?: number): Promise<ItemCategory[]> {
    try {
      const conditions = [
        eq(itemCategories.categoryType, type),
        eq(itemCategories.isActive, true)
      ];
      
      if (parentId !== undefined) {
        conditions.push(eq(itemCategories.parentId, parentId));
      }
      
      return await db
        .select()
        .from(itemCategories)
        .where(and(...conditions))
        .orderBy(itemCategories.displayOrder);
    } catch (error) {
      console.error('Error getting item categories by type:', error);
      throw error;
    }
  }

  async createItemCategory(data: InsertItemCategory): Promise<ItemCategory> {
    try {
      const [category] = await db
        .insert(itemCategories)
        .values(data)
        .returning();
      return category;
    } catch (error) {
      console.error('Error creating item category:', error);
      throw error;
    }
  }

  async updateItemCategory(id: number, data: Partial<InsertItemCategory>): Promise<ItemCategory> {
    try {
      const [category] = await db
        .update(itemCategories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(itemCategories.id, id))
        .returning();
      return category;
    } catch (error) {
      console.error('Error updating item category:', error);
      throw error;
    }
  }

  async deleteItemCategory(id: number): Promise<void> {
    try {
      await db
        .update(itemCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(itemCategories.id, id));
    } catch (error) {
      console.error('Error deleting item category:', error);
      throw error;
    }
  }

  // Missing methods for API endpoints
  async getActiveProjects(): Promise<Project[]> {
    try {
      return await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.isActive, true),
          eq(projects.status, 'active')
        ))
        .orderBy(projects.projectName);
    } catch (error) {
      console.error('Error getting active projects:', error);
      throw error;
    }
  }

  async getMajorCategories(): Promise<ItemCategory[]> {
    try {
      return await this.getItemCategoriesByType('major');
    } catch (error) {
      console.error('Error getting major categories:', error);
      throw error;
    }
  }

  async getMiddleCategories(majorId?: number): Promise<ItemCategory[]> {
    try {
      return await this.getItemCategoriesByType('middle', majorId);
    } catch (error) {
      console.error('Error getting middle categories:', error);
      throw error;
    }
  }

  async getMinorCategories(middleId?: number): Promise<ItemCategory[]> {
    try {
      return await this.getItemCategoriesByType('minor', middleId);
    } catch (error) {
      console.error('Error getting minor categories:', error);
      throw error;
    }
  }

  async getPositions(): Promise<any[]> {
    try {
      // Return mock position data for now
      return [
        { id: 1, name: '현장소장', code: 'site_manager', level: 1 },
        { id: 2, name: '현장대리', code: 'site_deputy', level: 2 },
        { id: 3, name: '현장팀장', code: 'site_team_leader', level: 3 },
        { id: 4, name: '현장기사', code: 'site_engineer', level: 4 },
        { id: 5, name: '현장기능공', code: 'site_worker', level: 5 }
      ];
    } catch (error) {
      console.error('Error getting positions:', error);
      throw error;
    }
  }

  // Item hierarchy methods for filters
  async getDistinctMajorCategories(): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ majorCategory: purchaseOrderItems.majorCategory })
        .from(purchaseOrderItems)
        .where(isNotNull(purchaseOrderItems.majorCategory))
        .orderBy(purchaseOrderItems.majorCategory);
      
      return result
        .map(row => row.majorCategory)
        .filter((cat): cat is string => cat !== null && cat !== '');
    } catch (error) {
      console.error('Error getting distinct major categories:', error);
      throw error;
    }
  }

  async getDistinctMiddleCategories(majorCategory?: string): Promise<string[]> {
    try {
      let query = db
        .selectDistinct({ middleCategory: purchaseOrderItems.middleCategory })
        .from(purchaseOrderItems)
        .where(isNotNull(purchaseOrderItems.middleCategory));
      
      if (majorCategory) {
        query = query.where(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      
      const result = await query.orderBy(purchaseOrderItems.middleCategory);
      
      return result
        .map(row => row.middleCategory)
        .filter((cat): cat is string => cat !== null && cat !== '');
    } catch (error) {
      console.error('Error getting distinct middle categories:', error);
      throw error;
    }
  }

  async getDistinctMinorCategories(majorCategory?: string, middleCategory?: string): Promise<string[]> {
    try {
      let conditions = [isNotNull(purchaseOrderItems.minorCategory)];
      
      if (majorCategory) {
        conditions.push(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      
      if (middleCategory) {
        conditions.push(eq(purchaseOrderItems.middleCategory, middleCategory));
      }
      
      const result = await db
        .selectDistinct({ minorCategory: purchaseOrderItems.minorCategory })
        .from(purchaseOrderItems)
        .where(and(...conditions))
        .orderBy(purchaseOrderItems.minorCategory);
      
      return result
        .map(row => row.minorCategory)
        .filter((cat): cat is string => cat !== null && cat !== '');
    } catch (error) {
      console.error('Error getting distinct minor categories:', error);
      throw error;
    }
  }

  // Category statistics
  async getCategoryOrderStats(userId?: string): Promise<Array<{
    majorCategory: string;
    middleCategory: string;
    minorCategory: string;
    orderCount: number;
    totalAmount: number;
  }>> {
    try {
      const whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;
      
      const results = await db
        .select({
          majorCategory: purchaseOrderItems.majorCategory,
          middleCategory: purchaseOrderItems.middleCategory,
          minorCategory: purchaseOrderItems.minorCategory,
          orderCount: count(purchaseOrderItems.id).as('orderCount'),
          totalAmount: sum(purchaseOrderItems.totalAmount).as('totalAmount')
        })
        .from(purchaseOrderItems)
        .innerJoin(purchaseOrders, eq(purchaseOrderItems.orderId, purchaseOrders.id))
        .where(whereClause)
        .groupBy(
          purchaseOrderItems.majorCategory, 
          purchaseOrderItems.middleCategory, 
          purchaseOrderItems.minorCategory
        )
        .orderBy(
          purchaseOrderItems.majorCategory,
          purchaseOrderItems.middleCategory,
          purchaseOrderItems.minorCategory
        );

      return results.map(row => ({
        majorCategory: row.majorCategory || '미분류',
        middleCategory: row.middleCategory || '미분류',
        minorCategory: row.minorCategory || '미분류',
        orderCount: Number(row.orderCount) || 0,
        totalAmount: Number(row.totalAmount) || 0
      }));
    } catch (error) {
      console.error('Error getting category order stats:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
