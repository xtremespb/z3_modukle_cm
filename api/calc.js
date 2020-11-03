module.exports = {
    legacy: (rangesData, componentsData, sum, months, percentage) => {
        const creditSum = parseFloat(sum);
        const creditMonths = parseFloat(months);
        const creditPercentage = parseFloat(percentage);
        let productCost = parseInt((creditSum * creditMonths * (creditPercentage / 100)) / 12, 10);
        let annexData = {};
        let componentsArray;
        let rangeIndex;
        rangesData.map((range, index) => {
            if (!componentsArray && productCost > range.from && (!range.to || productCost < range.to)) {
                componentsArray = range.components;
                rangeIndex = index;
            }
        });
        componentsArray = componentsArray || [];
        let selectedComponentsCost = 0;
        componentsArray.map(c => {
            const {
                cost,
            } = componentsData[c - 1];
            selectedComponentsCost += cost || 0;
        });
        let options = 1;
        let office = 0;
        if (productCost > selectedComponentsCost) {
            if (productCost - selectedComponentsCost < 200) {
                office = productCost - selectedComponentsCost;
            } else {
                options = parseInt((productCost - selectedComponentsCost) / 200, 10);
                const costDiff = productCost - (selectedComponentsCost + (options * 200));
                if (costDiff && costDiff < 200) {
                    office = parseInt(costDiff, 10);
                }
            }
        }
        let components = [];
        componentsArray.map(c => {
            annexData[`c${c}`] = true;
            const item = {
                title: componentsData[c - 1].title,
                amount: c === 2 ? options + 1 : componentsData[c - 1].amount,
                cost: c === 2 ? componentsData[c - 1].cost * (options + 1) : componentsData[c - 1].cost
            };
            const formula = componentsData[c - 1].formula || "";
            switch (formula) {
            case "guard":
                item.cost = productCost - selectedComponentsCost;
                office = 0;
            }
            if (formula !== "office") {
                components.push(item);
            }
        });
        if (rangeIndex === 0 && selectedComponentsCost > productCost) {
            productCost = 0;
            components = [];
            office = 0;
            annexData = {};
        }
        return {
            productCost,
            components,
            office,
            rangeIndex,
            annexData
        };
    }
};
