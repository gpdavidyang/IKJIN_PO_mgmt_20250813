import { Router } from "express";
import { requireAuth } from "../local-auth";
import { db } from "../db";
import { purchaseOrders, purchaseOrderItems, vendors, projects, items, itemCategories } from "@shared/schema";
import { eq, sql, and, gte, lte, inArray } from "drizzle-orm";
import * as XLSX from 'xlsx';

// Format currency to Korean Won
const formatKoreanWon = (amount: number): string => {
  return `₩${amount.toLocaleString('ko-KR')}`;
};

const router = Router();

// Debug endpoint to check database content (no auth for debugging)
router.get("/debug-data", async (req, res) => {
  try {
    console.log("Debug data endpoint called");
    
    // Check purchase orders
    const orderCount = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(purchaseOrders);
    
    // Check purchase order items
    const itemCount = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(purchaseOrderItems);
    
    // Check items with categories
    const itemsWithCategories = await db
      .select({
        count: sql<number>`count(*)`,
        withMajor: sql<number>`count(${items.majorCategory})`,
        withMiddle: sql<number>`count(${items.middleCategory})`,
        withMinor: sql<number>`count(${items.minorCategory})`,
      })
      .from(items);
    
    // Check vendors
    const vendorCount = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(vendors);
    
    // Sample data
    const sampleOrders = await db
      .select()
      .from(purchaseOrders)
      .limit(3);
      
    const sampleItems = await db
      .select()
      .from(purchaseOrderItems)
      .limit(3);
      
    const sampleItemsData = await db
      .select()
      .from(items)
      .limit(3);

    res.json({
      counts: {
        orders: orderCount[0],
        orderItems: itemCount[0],
        items: itemsWithCategories[0],
        vendors: vendorCount[0]
      },
      samples: {
        orders: sampleOrders,
        orderItems: sampleItems,
        items: sampleItemsData
      }
    });
    
  } catch (error) {
    console.error("Debug data error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// Helper function to parse date filters
const parseDateFilters = (startDate?: string, endDate?: string) => {
  const filters = [];
  if (startDate && startDate !== '') {
    filters.push(gte(purchaseOrders.orderDate, new Date(startDate)));
  }
  if (endDate && endDate !== '') {
    filters.push(lte(purchaseOrders.orderDate, new Date(endDate)));
  }
  return filters;
};

// Get report by category (대/중/소분류별) - with full item hierarchy support
router.get("/by-category", async (req, res) => {
  try {
    const { startDate, endDate, categoryType = 'major' } = req.query;
    const dateFilters = parseDateFilters(startDate as string, endDate as string);
    
    console.log("Category report filters:", { startDate, endDate, categoryType });

    // Get order items with category information from purchaseOrderItems
    let query = db
      .select({
        orderId: purchaseOrderItems.orderId,
        itemName: purchaseOrderItems.itemName,
        majorCategory: purchaseOrderItems.majorCategory,
        middleCategory: purchaseOrderItems.middleCategory,
        minorCategory: purchaseOrderItems.minorCategory,
        quantity: purchaseOrderItems.quantity,
        totalAmount: purchaseOrderItems.totalAmount,
        orderDate: purchaseOrders.orderDate,
        orderStatus: purchaseOrders.status,
        specification: purchaseOrderItems.specification,
        unitPrice: purchaseOrderItems.unitPrice,
      })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.orderId, purchaseOrders.id));
    
    if (dateFilters.length > 0) {
      query = query.where(and(...dateFilters));
    }
    
    const orderItemsWithCategories = await query;

    console.log("Order items with categories found:", orderItemsWithCategories.length);
    if (orderItemsWithCategories.length > 0) {
      console.log("Sample item:", orderItemsWithCategories[0]);
    }

    // Group by category with hierarchical structure
    const categoryReport = orderItemsWithCategories.reduce((acc, item) => {
      let categoryKey = '';
      let hierarchyPath = '';
      
      switch (categoryType) {
        case 'major':
          categoryKey = item.majorCategory || '미분류';
          hierarchyPath = categoryKey;
          break;
        case 'middle':
          categoryKey = item.middleCategory || '미분류';
          hierarchyPath = `${item.majorCategory || '미분류'} > ${categoryKey}`;
          break;
        case 'minor':
          categoryKey = item.minorCategory || '미분류';
          hierarchyPath = `${item.majorCategory || '미분류'} > ${item.middleCategory || '미분류'} > ${categoryKey}`;
          break;
      }

      if (!acc[categoryKey]) {
        acc[categoryKey] = {
          category: categoryKey,
          hierarchyPath: hierarchyPath,
          majorCategory: item.majorCategory,
          middleCategory: item.middleCategory,
          minorCategory: item.minorCategory,
          orderCount: new Set(),
          itemCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          statusBreakdown: {},
          topItems: {},
        };
      }

      acc[categoryKey].orderCount.add(item.orderId);
      acc[categoryKey].itemCount += 1;
      acc[categoryKey].totalQuantity += parseFloat(item.quantity);
      acc[categoryKey].totalAmount += parseFloat(item.totalAmount);
      
      // Status breakdown
      if (!acc[categoryKey].statusBreakdown[item.orderStatus]) {
        acc[categoryKey].statusBreakdown[item.orderStatus] = 0;
      }
      acc[categoryKey].statusBreakdown[item.orderStatus] += 1;

      // Top items tracking
      if (!acc[categoryKey].topItems[item.itemName]) {
        acc[categoryKey].topItems[item.itemName] = {
          quantity: 0,
          amount: 0,
          specification: item.specification
        };
      }
      acc[categoryKey].topItems[item.itemName].quantity += parseFloat(item.quantity);
      acc[categoryKey].topItems[item.itemName].amount += parseFloat(item.totalAmount);

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate order counts with top items
    const reportData = Object.values(categoryReport).map((item: any) => {
      const topItemsArray = Object.entries(item.topItems)
        .map(([name, data]: [string, any]) => ({
          itemName: name,
          quantity: data.quantity,
          amount: data.amount,
          specification: data.specification
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        ...item,
        orderCount: item.orderCount.size,
        averageAmount: item.totalAmount / item.itemCount,
        topItems: topItemsArray,
      };
    });

    // Sort by total amount descending
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      categoryType,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      },
      summary: {
        totalCategories: reportData.length,
        totalOrders: new Set(orderItemsWithCategories.map(item => item.orderId)).size,
        totalItems: orderItemsWithCategories.length,
        totalAmount: reportData.reduce((sum, item) => sum + item.totalAmount, 0),
      },
      data: reportData
    });

  } catch (error) {
    console.error("Error generating category report:", error);
    res.status(500).json({ error: "Failed to generate category report" });
  }
});

// Get report by project
router.get("/by-project", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;
    const filters = parseDateFilters(startDate as string, endDate as string);
    
    if (projectId) {
      filters.push(eq(purchaseOrders.projectId, parseInt(projectId as string)));
    }

    // Get orders with project information
    const ordersWithProjects = await db
      .select({
        projectId: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        projectStatus: projects.status,
        orderId: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        orderDate: purchaseOrders.orderDate,
        totalAmount: purchaseOrders.totalAmount,
        orderStatus: purchaseOrders.status,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .innerJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(filters.length > 0 ? and(...filters) : undefined);

    // Group by project
    const projectReport = ordersWithProjects.reduce((acc, order) => {
      const projectKey = order.projectId;
      
      if (!acc[projectKey]) {
        acc[projectKey] = {
          projectId: order.projectId,
          projectName: order.projectName,
          projectCode: order.projectCode,
          projectStatus: order.projectStatus,
          orderCount: 0,
          totalAmount: 0,
          vendors: new Set(),
          statusBreakdown: {},
          monthlyBreakdown: {},
        };
      }

      acc[projectKey].orderCount += 1;
      acc[projectKey].totalAmount += parseFloat(order.totalAmount);
      if (order.vendorId) {
        acc[projectKey].vendors.add(order.vendorName);
      }
      
      // Status breakdown
      if (!acc[projectKey].statusBreakdown[order.orderStatus]) {
        acc[projectKey].statusBreakdown[order.orderStatus] = 0;
      }
      acc[projectKey].statusBreakdown[order.orderStatus] += 1;

      // Monthly breakdown
      const month = new Date(order.orderDate).toISOString().slice(0, 7);
      if (!acc[projectKey].monthlyBreakdown[month]) {
        acc[projectKey].monthlyBreakdown[month] = {
          count: 0,
          amount: 0
        };
      }
      acc[projectKey].monthlyBreakdown[month].count += 1;
      acc[projectKey].monthlyBreakdown[month].amount += parseFloat(order.totalAmount);

      return acc;
    }, {} as Record<number, any>);

    // Convert to array
    const reportData = Object.values(projectReport).map((item: any) => ({
      ...item,
      vendorCount: item.vendors.size,
      vendors: Array.from(item.vendors),
      averageOrderAmount: item.totalAmount / item.orderCount,
    }));

    // Sort by total amount descending
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      },
      summary: {
        totalProjects: reportData.length,
        totalOrders: ordersWithProjects.length,
        totalAmount: reportData.reduce((sum, item) => sum + item.totalAmount, 0),
        averagePerProject: reportData.length > 0 ? 
          reportData.reduce((sum, item) => sum + item.totalAmount, 0) / reportData.length : 0,
      },
      data: reportData
    });

  } catch (error) {
    console.error("Error generating project report:", error);
    res.status(500).json({ error: "Failed to generate project report" });
  }
});

// Get report by vendor - temporarily remove auth for debugging  
router.get("/by-vendor", async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    const filters = parseDateFilters(startDate as string, endDate as string);
    
    console.log("Vendor report starting...");
    console.log("Vendor report filters:", { startDate, endDate, vendorId, filters });
    
    console.log("Starting vendor report generation...");

    // Get orders with vendor information (using leftJoin to include orders without vendors)
    let vendorQuery = db
      .select({
        vendorId: vendors.id,
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        businessNumber: vendors.businessNumber,
        orderId: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        orderDate: purchaseOrders.orderDate,
        totalAmount: purchaseOrders.totalAmount,
        orderStatus: purchaseOrders.status,
        projectId: purchaseOrders.projectId,
        projectName: projects.projectName,
        originalVendorId: purchaseOrders.vendorId, // Add original vendorId for null check
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id));
    
    if (filters.length > 0) {
      vendorQuery = vendorQuery.where(and(...filters));
    }
    
    const ordersWithVendors = await vendorQuery;

    console.log("Orders with vendors found:", ordersWithVendors.length);

    // Get order items for each order to analyze item categories
    const orderIds = ordersWithVendors.map(o => o.orderId);
    const orderItemsData = await db
      .select({
        orderId: purchaseOrderItems.orderId,
        itemName: purchaseOrderItems.itemName,
        majorCategory: purchaseOrderItems.majorCategory,
        quantity: purchaseOrderItems.quantity,
        totalAmount: purchaseOrderItems.totalAmount,
      })
      .from(purchaseOrderItems)
      .where(inArray(purchaseOrderItems.orderId, orderIds));

    // Group by vendor (handle null vendors)
    const vendorReport = ordersWithVendors.reduce((acc, order) => {
      const vendorKey = order.vendorId || 'unassigned'; // Use 'unassigned' for null vendors
      
      if (!acc[vendorKey]) {
        acc[vendorKey] = {
          vendorId: order.vendorId,
          vendorName: order.vendorName || '거래처 미지정',
          vendorCode: order.vendorCode || 'N/A',
          businessNumber: order.businessNumber || 'N/A',
          orderCount: 0,
          totalAmount: 0,
          projects: new Set(),
          statusBreakdown: {},
          monthlyBreakdown: {},
          categoryBreakdown: {},
          topItems: {},
        };
      }

      acc[vendorKey].orderCount += 1;
      acc[vendorKey].totalAmount += parseFloat(order.totalAmount);
      if (order.projectId) {
        acc[vendorKey].projects.add(order.projectName);
      }
      
      // Status breakdown
      if (!acc[vendorKey].statusBreakdown[order.orderStatus]) {
        acc[vendorKey].statusBreakdown[order.orderStatus] = 0;
      }
      acc[vendorKey].statusBreakdown[order.orderStatus] += 1;

      // Monthly breakdown
      const month = new Date(order.orderDate).toISOString().slice(0, 7);
      if (!acc[vendorKey].monthlyBreakdown[month]) {
        acc[vendorKey].monthlyBreakdown[month] = {
          count: 0,
          amount: 0
        };
      }
      acc[vendorKey].monthlyBreakdown[month].count += 1;
      acc[vendorKey].monthlyBreakdown[month].amount += parseFloat(order.totalAmount);

      return acc;
    }, {} as Record<string | number, any>);

    // Add item category analysis
    orderItemsData.forEach(item => {
      const order = ordersWithVendors.find(o => o.orderId === item.orderId);
      if (order) {
        const vendorKey = order.vendorId || 'unassigned';
        if (vendorReport[vendorKey]) {
          const vendor = vendorReport[vendorKey];
        
          // Category breakdown
          const category = item.majorCategory || '미분류';
          if (!vendor.categoryBreakdown[category]) {
            vendor.categoryBreakdown[category] = {
              count: 0,
              amount: 0
            };
          }
          vendor.categoryBreakdown[category].count += 1;
          vendor.categoryBreakdown[category].amount += parseFloat(item.totalAmount);

          // Top items
          if (!vendor.topItems[item.itemName]) {
            vendor.topItems[item.itemName] = {
              quantity: 0,
              amount: 0
            };
          }
          vendor.topItems[item.itemName].quantity += parseFloat(item.quantity);
          vendor.topItems[item.itemName].amount += parseFloat(item.totalAmount);
        }
      }
    });

    // Convert to array and process top items
    const reportData = Object.values(vendorReport).map((vendor: any) => {
      // Get top 5 items by amount
      const topItemsArray = Object.entries(vendor.topItems)
        .map(([name, data]: [string, any]) => ({
          itemName: name,
          quantity: data.quantity,
          amount: data.amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        ...vendor,
        projectCount: vendor.projects.size,
        projects: Array.from(vendor.projects),
        averageOrderAmount: vendor.totalAmount / vendor.orderCount,
        topItems: topItemsArray,
      };
    });

    // Sort by total amount descending
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      },
      summary: {
        totalVendors: reportData.length,
        totalOrders: ordersWithVendors.length,
        totalAmount: reportData.reduce((sum, item) => sum + item.totalAmount, 0),
        averagePerVendor: reportData.length > 0 ? 
          reportData.reduce((sum, item) => sum + item.totalAmount, 0) / reportData.length : 0,
      },
      data: reportData
    });

  } catch (error) {
    console.error("Error generating vendor report:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ 
      error: "Failed to generate vendor report",
      details: error.message,
      debug: "Check server console for full error"
    });
  }
});

// Export reports to Excel
router.get("/export-excel", requireAuth, async (req, res) => {
  try {
    const { type, startDate, endDate, categoryType } = req.query;
    
    let reportData: any;
    let sheetName: string;
    
    switch (type) {
      case 'category':
        const categoryResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/by-category?startDate=${startDate || ''}&endDate=${endDate || ''}&categoryType=${categoryType || 'major'}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        reportData = await categoryResponse.json();
        sheetName = '분류별 보고서';
        break;
        
      case 'project':
        const projectResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/by-project?startDate=${startDate || ''}&endDate=${endDate || ''}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        reportData = await projectResponse.json();
        sheetName = '프로젝트별 보고서';
        break;
        
      case 'vendor':
        const vendorResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/by-vendor?startDate=${startDate || ''}&endDate=${endDate || ''}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        reportData = await vendorResponse.json();
        sheetName = '거래처별 보고서';
        break;
        
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add summary sheet
    const summaryData = [
      ['보고서 유형', sheetName],
      ['기간', `${reportData.period.startDate} ~ ${reportData.period.endDate}`],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      [],
      ['요약 정보'],
    ];
    
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key === 'totalCategories' ? '총 분류 수' :
                   key === 'totalProjects' ? '총 프로젝트 수' :
                   key === 'totalVendors' ? '총 거래처 수' :
                   key === 'totalOrders' ? '총 발주 수' :
                   key === 'totalItems' ? '총 품목 수' :
                   key === 'totalAmount' ? '총 금액' :
                   key === 'averagePerProject' ? '프로젝트당 평균' :
                   key === 'averagePerVendor' ? '거래처당 평균' : key;
      
      const formattedValue = key.includes('Amount') || key.includes('average') ? 
        formatKoreanWon(Math.floor(value as number)) : value;
      
      summaryData.push([label, formattedValue]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, '요약');
    
    // Add detail sheet based on report type
    let detailData: any[] = [];
    
    if (type === 'category') {
      detailData = [
        ['분류', '발주 수', '품목 수', '총 수량', '총 금액', '평균 금액']
      ];
      reportData.data.forEach((item: any) => {
        detailData.push([
          item.category,
          item.orderCount,
          item.itemCount,
          item.totalQuantity,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageAmount))
        ]);
      });
    } else if (type === 'project') {
      detailData = [
        ['프로젝트명', '프로젝트 코드', '상태', '발주 수', '거래처 수', '총 금액', '평균 금액']
      ];
      reportData.data.forEach((item: any) => {
        detailData.push([
          item.projectName,
          item.projectCode,
          item.projectStatus,
          item.orderCount,
          item.vendorCount,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageOrderAmount))
        ]);
      });
    } else if (type === 'vendor') {
      detailData = [
        ['거래처명', '거래처 코드', '사업자번호', '발주 수', '프로젝트 수', '총 금액', '평균 금액']
      ];
      reportData.data.forEach((item: any) => {
        detailData.push([
          item.vendorName,
          item.vendorCode,
          item.businessNumber,
          item.orderCount,
          item.projectCount,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageOrderAmount))
        ]);
      });
    }
    
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailSheet, '상세 데이터');
    
    // Generate Excel file
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
});

// Get comprehensive summary report
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilters = parseDateFilters(startDate as string, endDate as string);

    // Get orders summary
    const ordersSummary = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${purchaseOrders.totalAmount})`,
        avgAmount: sql<number>`avg(${purchaseOrders.totalAmount})`,
      })
      .from(purchaseOrders)
      .where(dateFilters.length > 0 ? and(...dateFilters) : undefined);

    // Get status breakdown
    const statusBreakdown = await db
      .select({
        status: purchaseOrders.status,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${purchaseOrders.totalAmount})`,
      })
      .from(purchaseOrders)
      .where(and(...dateFilters))
      .groupBy(purchaseOrders.status);

    // Get top vendors
    const topVendors = await db
      .select({
        vendorId: vendors.id,
        vendorName: vendors.name,
        orderCount: sql<number>`count(${purchaseOrders.id})`,
        totalAmount: sql<number>`sum(${purchaseOrders.totalAmount})`,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(...dateFilters))
      .groupBy(vendors.id, vendors.name)
      .orderBy(sql`sum(${purchaseOrders.totalAmount}) desc`)
      .limit(10);

    // Get top projects
    const topProjects = await db
      .select({
        projectId: projects.id,
        projectName: projects.projectName,
        orderCount: sql<number>`count(${purchaseOrders.id})`,
        totalAmount: sql<number>`sum(${purchaseOrders.totalAmount})`,
      })
      .from(purchaseOrders)
      .innerJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .where(and(...dateFilters))
      .groupBy(projects.id, projects.projectName)
      .orderBy(sql`sum(${purchaseOrders.totalAmount}) desc`)
      .limit(10);

    // Get monthly trend
    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`,
        orderCount: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${purchaseOrders.totalAmount})`,
      })
      .from(purchaseOrders)
      .where(and(...dateFilters))
      .groupBy(sql`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`);

    res.json({
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      },
      summary: ordersSummary[0],
      statusBreakdown,
      topVendors,
      topProjects,
      monthlyTrend,
    });

  } catch (error) {
    console.error("Error generating summary report:", error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
});

export default router;