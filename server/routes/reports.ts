import { Router } from "express";
import { requireAuth } from "../local-auth";
import { db } from "../db";
import { purchaseOrders, purchaseOrderItems, vendors, projects, items, itemCategories, users } from "@shared/schema";
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

// Debug endpoint for processing report (no auth for debugging)
router.get("/debug-processing", async (req, res) => {
  try {
    console.log("Debug processing endpoint called");
    
    // Get all orders without any filters
    const allOrders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
      })
      .from(purchaseOrders)
      .limit(10);
    
    // Get orders with joins (same as processing endpoint)
    const ordersWithJoins = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        projectName: projects.projectName,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .limit(10);
    
    res.json({
      totalOrders: allOrders.length,
      ordersWithoutJoins: allOrders,
      ordersWithJoins: ordersWithJoins,
      message: "Debug data fetched successfully"
    });
    
  } catch (error) {
    console.error("Debug processing error:", error);
    res.status(500).json({ error: error.message });
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
    const { 
      startDate, 
      endDate, 
      majorCategory,
      middleCategory,
      minorCategory 
    } = req.query;
    const dateFilters = parseDateFilters(startDate as string, endDate as string);
    
    console.log("Category report filters:", { 
      startDate, 
      endDate, 
      majorCategory,
      middleCategory,
      minorCategory 
    });

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
    
    // Build filter conditions
    const filters = [...dateFilters];
    
    // Add hierarchical category filters
    if (majorCategory && majorCategory !== 'all') {
      filters.push(eq(purchaseOrderItems.majorCategory, majorCategory as string));
    }
    if (middleCategory && middleCategory !== 'all') {
      filters.push(eq(purchaseOrderItems.middleCategory, middleCategory as string));
    }
    if (minorCategory && minorCategory !== 'all') {
      filters.push(eq(purchaseOrderItems.minorCategory, minorCategory as string));
    }
    
    if (filters.length > 0) {
      query = query.where(and(...filters));
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
      
      // Determine the grouping level based on the filters
      if (minorCategory && minorCategory !== 'all') {
        // Group by minor category (most specific)
        categoryKey = item.minorCategory || '미분류';
        hierarchyPath = `${item.majorCategory || '미분류'} > ${item.middleCategory || '미분류'} > ${categoryKey}`;
      } else if (middleCategory && middleCategory !== 'all') {
        // Group by minor categories under this middle category
        categoryKey = item.minorCategory || '미분류';
        hierarchyPath = `${item.majorCategory || '미분류'} > ${item.middleCategory || '미분류'} > ${categoryKey}`;
      } else if (majorCategory && majorCategory !== 'all') {
        // Group by middle categories under this major category
        categoryKey = item.middleCategory || '미분류';
        hierarchyPath = `${item.majorCategory || '미분류'} > ${categoryKey}`;
      } else {
        // No specific filter, group by major categories
        categoryKey = item.majorCategory || '미분류';
        hierarchyPath = categoryKey;
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
        
      case 'processing':
        // Build query params for processing report
        const processingParams = new URLSearchParams();
        if (startDate) processingParams.append('startDate', startDate as string);
        if (endDate) processingParams.append('endDate', endDate as string);
        processingParams.append('limit', '1000'); // Export all data
        
        const processingResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/processing?${processingParams.toString()}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        
        if (!processingResponse.ok) {
          throw new Error(`Processing API error: ${processingResponse.status}`);
        }
        
        reportData = await processingResponse.json();
        sheetName = '발주 내역 검색';
        break;
        
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add summary sheet
    const summaryData = [
      ['보고서 유형', sheetName],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      [],
      ['요약 정보'],
    ];
    
    // Add period info if available
    if (reportData.period) {
      summaryData.splice(2, 0, ['기간', `${reportData.period.startDate} ~ ${reportData.period.endDate}`]);
    }
    
    // Add summary info if available
    if (reportData.summary) {
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
    } else if (type === 'processing' && reportData.total !== undefined) {
      // For processing reports, add basic summary info
      summaryData.push(['총 발주 수', reportData.total]);
      if (reportData.summary?.totalOrders) {
        summaryData.push(['검색된 발주 수', reportData.summary.totalOrders]);
      }
      if (reportData.summary?.totalAmount) {
        summaryData.push(['총 금액', formatKoreanWon(Math.floor(reportData.summary.totalAmount))]);
      }
    }
    
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
    } else if (type === 'processing') {
      detailData = [
        ['발주번호', '발주일자', '프로젝트명', '거래처명', '총 금액', '상태', '생성일시']
      ];
      
      if (reportData.orders && Array.isArray(reportData.orders)) {
        reportData.orders.forEach((order: any) => {
          const statusText = order.status === 'draft' ? '임시 저장' :
                            order.status === 'pending' ? '승인 대기' :
                            order.status === 'approved' ? '진행 중' :
                            order.status === 'sent' ? '발송됨' :
                            order.status === 'completed' ? '완료' :
                            order.status === 'rejected' ? '반려' :
                            order.status;
          
          detailData.push([
            order.orderNumber || '-',
            order.orderDate || '-',
            order.projectName || '-',
            order.vendorName || '-',
            order.totalAmount ? formatKoreanWon(Math.floor(order.totalAmount)) : '-',
            statusText,
            order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR') : '-'
          ]);
        });
      }
    }
    
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailSheet, '상세 데이터');
    
    // Generate Excel file
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Use ASCII-safe filename to avoid header encoding issues
    const safeFileName = type === 'processing' ? 'order_processing_report' :
                        type === 'category' ? 'category_report' :
                        type === 'project' ? 'project_report' :
                        type === 'vendor' ? 'vendor_report' : 'report';
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${safeFileName}_${dateStr}.xlsx`;
    
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
});

// Test endpoint for processing report (no auth)
router.get("/processing-test", async (req, res) => {
  try {
    console.log("Processing test endpoint called");
    
    // Simple query without filters
    const orders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
      })
      .from(purchaseOrders)
      .limit(5);
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders,
      message: "Test endpoint working"
    });
  } catch (error) {
    console.error("Processing test error:", error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

// Get processing report (발주 내역 검색)
router.get("/processing", requireAuth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      year, 
      month, 
      status, 
      projectId, 
      vendorId,
      search,
      page = "1",
      limit = "100"
    } = req.query;
    
    console.log("Processing report filters:", { startDate, endDate, year, month, status, projectId, vendorId, search });

    // Build filters
    const filters = [];
    
    // Date filtering
    if (startDate && startDate !== '') {
      filters.push(gte(purchaseOrders.orderDate, new Date(startDate as string)));
    }
    if (endDate && endDate !== '') {
      filters.push(lte(purchaseOrders.orderDate, new Date(endDate as string)));
    }
    
    // Year filtering
    if (year && year !== 'all' && year !== '') {
      const yearNum = parseInt(year as string);
      filters.push(
        and(
          gte(purchaseOrders.orderDate, new Date(`${yearNum}-01-01`)),
          lte(purchaseOrders.orderDate, new Date(`${yearNum}-12-31`))
        )
      );
    }
    
    // Month filtering (in combination with year)
    if (month && month !== 'all' && month !== '' && year && year !== 'all') {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0);
      filters.push(
        and(
          gte(purchaseOrders.orderDate, startOfMonth),
          lte(purchaseOrders.orderDate, endOfMonth)
        )
      );
    }
    
    // Status filtering
    if (status && status !== 'all' && status !== '') {
      filters.push(eq(purchaseOrders.status, status as string));
    }
    
    // Project filtering
    if (projectId && projectId !== 'all' && projectId !== '') {
      filters.push(eq(purchaseOrders.projectId, parseInt(projectId as string)));
    }
    
    // Vendor filtering
    if (vendorId && vendorId !== 'all' && vendorId !== '') {
      filters.push(eq(purchaseOrders.vendorId, parseInt(vendorId as string)));
    }

    console.log(`Processing report filters count: ${filters.length}`);

    // Get orders with basic details first
    let ordersQuery = db
      .select()
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id));

    if (filters.length > 0) {
      ordersQuery = ordersQuery.where(and(...filters));
    }

    // Search functionality
    if (search && search !== '') {
      const searchFilter = sql`(
        ${purchaseOrders.orderNumber} ILIKE ${`%${search}%`} OR
        ${vendors.name} ILIKE ${`%${search}%`} OR
        ${projects.projectName} ILIKE ${`%${search}%`} OR
        ${purchaseOrders.notes} ILIKE ${`%${search}%`}
      )`;
      if (filters.length > 0) {
        ordersQuery = ordersQuery.where(and(and(...filters), searchFilter));
      } else {
        ordersQuery = ordersQuery.where(searchFilter);
      }
    }

    // Add pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Apply orderBy, offset, and limit
    ordersQuery = ordersQuery
      .orderBy(purchaseOrders.orderDate)
      .offset(offset)
      .limit(limitNum);

    const orders = await ordersQuery;

    console.log(`Processing report found ${orders.length} orders`);

    // Debug: Log first order structure
    if (orders.length > 0) {
      console.log("Debug: First order structure:", {
        purchaseOrders: orders[0].purchase_orders ? 'exists' : 'null',
        users: orders[0].users ? 'exists' : 'null',
        vendors: orders[0].vendors ? 'exists' : 'null',
        projects: orders[0].projects ? 'exists' : 'null'
      });
    }

    // Transform joined data to flat structure
    const flatOrders = orders.map(row => ({
      // Order data
      id: row.purchase_orders?.id,
      orderNumber: row.purchase_orders?.orderNumber,
      orderDate: row.purchase_orders?.orderDate,
      status: row.purchase_orders?.status,
      totalAmount: row.purchase_orders?.totalAmount,
      deliveryDate: row.purchase_orders?.deliveryDate,
      notes: row.purchase_orders?.notes,
      createdAt: row.purchase_orders?.createdAt,
      updatedAt: row.purchase_orders?.updatedAt,
      userId: row.purchase_orders?.userId,
      
      // Project data
      projectId: row.projects?.id,
      projectName: row.projects?.projectName,
      projectCode: row.projects?.projectCode,
      
      // Vendor data
      vendorId: row.vendors?.id,
      vendorName: row.vendors?.name,
      vendorCode: row.vendors?.vendorCode,
      
      // User data
      userName: row.users?.name,
      userFirstName: row.users?.firstName,
      userLastName: row.users?.lastName,
    })).filter(order => order.id); // Filter out any null orders

    console.log(`Processing report found ${flatOrders.length} orders after flattening`);

    // Get order items for each order
    if (flatOrders.length > 0) {
      const orderIds = flatOrders.map(o => o.id);
      const orderItems = await db
        .select({
          orderId: purchaseOrderItems.orderId,
          id: purchaseOrderItems.id,
          itemName: purchaseOrderItems.itemName,
          majorCategory: purchaseOrderItems.majorCategory,
          middleCategory: purchaseOrderItems.middleCategory,
          minorCategory: purchaseOrderItems.minorCategory,
          specification: purchaseOrderItems.specification,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
          totalAmount: purchaseOrderItems.totalAmount,
          unit: purchaseOrderItems.unit,
          notes: purchaseOrderItems.notes,
        })
        .from(purchaseOrderItems)
        .where(inArray(purchaseOrderItems.orderId, orderIds));

      // Attach items to orders
      const ordersWithItems = flatOrders.map(order => ({
        ...order,
        items: orderItems.filter(item => item.orderId === order.id)
      }));

      // Get total count for pagination
      let countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id));

      if (filters.length > 0) {
        countQuery = countQuery.where(and(...filters));
      }

      if (search && search !== '') {
        const searchFilter = sql`(
          ${purchaseOrders.orderNumber} ILIKE ${`%${search}%`} OR
          ${vendors.name} ILIKE ${`%${search}%`} OR
          ${projects.projectName} ILIKE ${`%${search}%`} OR
          ${purchaseOrders.notes} ILIKE ${`%${search}%`}
        )`;
        if (filters.length > 0) {
          countQuery = countQuery.where(and(and(...filters), searchFilter));
        } else {
          countQuery = countQuery.where(searchFilter);
        }
      }

      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;

      res.json({
        orders: ordersWithItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
          totalOrders: ordersWithItems.length,
          totalAmount: ordersWithItems.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0),
        }
      });
    } else {
      res.json({
        orders: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        summary: {
          totalOrders: 0,
          totalAmount: 0,
        }
      });
    }

  } catch (error) {
    console.error("Error generating processing report:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ 
      error: "Failed to generate processing report",
      details: error.message
    });
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