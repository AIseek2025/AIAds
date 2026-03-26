import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import { styled } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';

// Services
import { campaignAPI } from '../../services/advertiserApi';

// Types
import type { Campaign } from '../../types';

// Styled Components
const StepContentCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const PreviewCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.action.hover,
}));

const tagsOptions = [
  '时尚',
  '美妆',
  '科技',
  '数码',
  '美食',
  '旅行',
  '健身',
  '教育',
  '游戏',
  '音乐',
  '影视',
  '母婴',
  '家居',
  '汽车',
  '金融',
];

const platformOptions = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const locationOptions = [
  { value: 'US', label: '美国' },
  { value: 'UK', label: '英国' },
  { value: 'CA', label: '加拿大' },
  { value: 'AU', label: '澳大利亚' },
  { value: 'DE', label: '德国' },
  { value: 'FR', label: '法国' },
  { value: 'JP', label: '日本' },
  { value: 'KR', label: '韩国' },
  { value: 'CN', label: '中国' },
  { value: 'IN', label: '印度' },
  { value: 'BR', label: '巴西' },
  { value: 'MX', label: '墨西哥' },
];

const ageRangeOptions = [
  { value: '13-17', label: '13-17 岁' },
  { value: '18-24', label: '18-24 岁' },
  { value: '25-34', label: '25-34 岁' },
  { value: '35-44', label: '35-44 岁' },
  { value: '45-54', label: '45-54 岁' },
  { value: '55-64', label: '55-64 岁' },
  { value: '65+', label: '65 岁以上' },
];

const interestOptions = [
  '时尚穿搭',
  '美妆护肤',
  '科技数码',
  '美食烹饪',
  '旅行探险',
  '健身运动',
  '学习教育',
  '游戏电竞',
  '音乐舞蹈',
  '影视娱乐',
  '母婴育儿',
  '家居生活',
  '汽车摩托',
  '金融理财',
  '摄影艺术',
  '宠物动物',
];

export const CampaignCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState<Partial<Campaign>>({
    title: '',
    description: '',
    objective: 'awareness',
    budget: 5000,
    budgetType: 'fixed',
    targetAudience: {
      ageRange: '18-35',
      gender: 'all',
      locations: [],
      interests: [],
    },
    targetPlatforms: [],
    minFollowers: 5000,
    maxFollowers: 50000,
    minEngagementRate: 0.02,
    requiredCategories: [],
    targetCountries: [],
    contentRequirements: '',
    requiredHashtags: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: campaignAPI.createCampaign,
    onSuccess: (data: any) => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: '活动创建成功！',
      });
      setTimeout(() => {
        navigate(`/advertiser/campaigns/${data.id}`);
      }, 1000);
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: error.response?.data?.error?.message || '创建失败，请稍后重试',
      });
    },
  });

  // Steps definition
  const steps = ['基本信息', '目标受众', '预算设置', '确认提交'];

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle target audience changes
  const handleTargetAudienceChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: { ...prev.targetAudience!, [field]: value },
    }));
  };

  // Handle array field changes
  const handleArrayFieldChange = (field: string, values: string[]) => {
    setFormData((prev) => ({ ...prev, [field]: values }));
  };

  // Handle hashtag add
  const handleHashtagAdd = () => {
    if (hashtagInput.trim()) {
      const newHashtag = hashtagInput.trim().replace('#', '');
      if (!formData.requiredHashtags?.includes(newHashtag)) {
        handleArrayFieldChange('requiredHashtags', [
          ...(formData.requiredHashtags || []),
          newHashtag,
        ]);
      }
      setHashtagInput('');
    }
  };

  // Handle hashtag delete
  const handleHashtagDelete = (hashtag: string) => {
    handleArrayFieldChange(
      'requiredHashtags',
      formData.requiredHashtags?.filter((h) => h !== hashtag) || []
    );
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Basic info validation
      if (!formData.title?.trim()) {
        newErrors.title = '请输入活动标题';
      } else if (formData.title.length < 5) {
        newErrors.title = '活动标题至少 5 个字符';
      }
      if (!formData.description?.trim()) {
        newErrors.description = '请输入活动描述';
      }
      if (!formData.objective) {
        newErrors.objective = '请选择活动目标';
      }
    } else if (step === 1) {
      // Target audience validation
      if (!formData.targetAudience?.ageRange) {
        newErrors.ageRange = '请选择年龄范围';
      }
      if (formData.targetPlatforms?.length === 0) {
        newErrors.targetPlatforms = '请选择目标平台';
      }
    } else if (step === 2) {
      // Budget validation
      if (!formData.budget || formData.budget < 100) {
        newErrors.budget = '预算至少为 ¥100';
      }
      if (!formData.startDate) {
        newErrors.startDate = '请选择开始日期';
      }
      if (!formData.endDate) {
        newErrors.endDate = '请选择结束日期';
      }
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (end <= start) {
          newErrors.endDate = '结束日期必须晚于开始日期';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle step navigation
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Handle submit
  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      const submitData = {
        ...formData,
        targetAudience: {
          ...formData.targetAudience,
          locations: formData.targetAudience?.locations || [],
          interests: formData.targetAudience?.interests || [],
        },
      };
      createMutation.mutate(submitData as Partial<Campaign>);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <StepContentCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本信息
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                填写活动的基本信息，包括标题、描述和目标
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="活动标题"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    error={!!errors.title}
                    helperText={
                      errors.title || `${formData.title?.length || 0}/50 字符`
                    }
                    required
                    inputProps={{ maxLength: 50 }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="活动描述"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    error={!!errors.description}
                    helperText={errors.description || '简要描述您的活动内容和目标'}
                    required
                    multiline
                    rows={4}
                    inputProps={{ maxLength: 500 }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControl component="fieldset" error={!!errors.objective}>
                    <FormLabel component="legend">活动目标</FormLabel>
                    <RadioGroup
                      row
                      name="objective"
                      value={formData.objective}
                      onChange={handleInputChange}
                    >
                      <FormControlLabel
                        value="awareness"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              品牌曝光
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              提高品牌知名度，扩大影响力
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="consideration"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              用户互动
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              增加用户互动，提高参与度
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="conversion"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              转化购买
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              促进销售转化，提高 ROI
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                    {errors.objective && (
                      <Typography color="error" variant="caption">
                        {errors.objective}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </StepContentCard>
        );

      case 1:
        return (
          <StepContentCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                目标受众
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                定义您的目标受众群体和投放平台
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="年龄范围"
                    value={formData.targetAudience?.ageRange || ''}
                    onChange={(e) =>
                      handleTargetAudienceChange('ageRange', e.target.value)
                    }
                    error={!!errors.ageRange}
                    helperText={errors.ageRange}
                  >
                    {ageRangeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">性别</FormLabel>
                    <RadioGroup
                      row
                      name="gender"
                      value={formData.targetAudience?.gender || 'all'}
                      onChange={(e) =>
                        handleTargetAudienceChange(
                          'gender',
                          e.target.value as 'male' | 'female' | 'all'
                        )
                      }
                    >
                      <FormControlLabel
                        value="all"
                        control={<Radio />}
                        label="全部"
                      />
                      <FormControlLabel
                        value="male"
                        control={<Radio />}
                        label="男性"
                      />
                      <FormControlLabel
                        value="female"
                        control={<Radio />}
                        label="女性"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={locationOptions}
                    value={
                      locationOptions.filter(
                        (loc) =>
                          formData.targetAudience?.locations?.includes(loc.value)
                      ) || []
                    }
                    onChange={(_, newValue) => {
                      handleTargetAudienceChange(
                        'locations',
                        newValue.map((item) => item.value)
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="目标地区"
                        placeholder="选择目标地区"
                      />
                    )}
                    getOptionLabel={(option) => option.label}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={interestOptions}
                    value={formData.targetAudience?.interests || []}
                    onChange={(_, newValue) => {
                      handleTargetAudienceChange('interests', newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="兴趣标签"
                        placeholder="添加兴趣标签"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          key={option}
                        />
                      ))
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={platformOptions}
                    value={
                      platformOptions.filter(
                        (p) => formData.targetPlatforms?.includes(p.value)
                      ) || []
                    }
                    onChange={(_, newValue) => {
                      handleArrayFieldChange(
                        'targetPlatforms',
                        newValue.map((item) => item.value)
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="目标平台"
                        placeholder="选择投放平台"
                        error={!!errors.targetPlatforms}
                      />
                    )}
                    getOptionLabel={(option) => option.label}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.label}
                          {...getTagProps({ index })}
                          key={option.value}
                        />
                      ))
                    }
                  />
                  {errors.targetPlatforms && (
                    <Typography color="error" variant="caption">
                      {errors.targetPlatforms}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    KOL 粉丝要求
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Typography id="followers-slider" gutterBottom>
                      粉丝数范围：{formData.minFollowers?.toLocaleString()} -{' '}
                      {formData.maxFollowers?.toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        5K
                      </Typography>
                      <Slider
                        value={[formData.minFollowers || 5000, formData.maxFollowers || 50000]}
                        onChange={(_, newValue) => {
                          if (Array.isArray(newValue)) {
                            setFormData((prev) => ({
                              ...prev,
                              minFollowers: newValue[0],
                              maxFollowers: newValue[1],
                            }));
                          }
                        }}
                        valueLabelDisplay="auto"
                        min={1000}
                        max={1000000}
                        step={1000}
                        valueLabelFormat={(value) =>
                          value >= 1000 ? `${value / 1000}K` : value.toString()
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        1M
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    最低互动率
                  </Typography>
                  <Slider
                    value={formData.minEngagementRate || 0.02}
                    onChange={(_, newValue) => {
                      setFormData((prev) => ({
                        ...prev,
                        minEngagementRate: newValue as number,
                      }));
                    }}
                    min={0}
                    max={0.1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 0.02, label: '2%' },
                      { value: 0.05, label: '5%' },
                      { value: 0.1, label: '10%' },
                    ]}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </StepContentCard>
        );

      case 2:
        return (
          <StepContentCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                预算设置
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                设置活动预算和时间安排
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend">预算类型</FormLabel>
                    <RadioGroup
                      row
                      name="budgetType"
                      value={formData.budgetType}
                      onChange={handleInputChange}
                    >
                      <FormControlLabel
                        value="fixed"
                        control={<Radio />}
                        label="固定预算"
                      />
                      <FormControlLabel
                        value="dynamic"
                        control={<Radio />}
                        label="动态预算"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="预算金额 (¥)"
                    name="budget"
                    type="number"
                    value={formData.budget}
                    onChange={handleInputChange}
                    error={!!errors.budget}
                    helperText={errors.budget || '最低预算 ¥100'}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">¥</InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    活动时间
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="开始日期"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    required
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: new Date().toISOString().split('T')[0] }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="结束日期"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    required
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: formData.startDate || new Date().toISOString().split('T')[0],
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Alert icon={<InfoIcon />} severity="info">
                    <Typography variant="body2">
                      活动将持续{' '}
                      {formData.startDate && formData.endDate
                        ? Math.ceil(
                            (new Date(formData.endDate).getTime() -
                              new Date(formData.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : 0}{' '}
                      天
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </StepContentCard>
        );

      case 3:
        return (
          <StepContentCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                确认提交
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                请确认以下信息无误后提交活动
              </Typography>

              <PreviewCard>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {formData.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formData.description}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Divider />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      活动目标
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formData.objective === 'awareness'
                        ? '品牌曝光'
                        : formData.objective === 'consideration'
                        ? '用户互动'
                        : '转化购买'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      预算金额
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formatCurrency(formData.budget || 0)}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      开始日期
                    </Typography>
                    <Typography variant="body2">
                      {formData.startDate
                        ? new Date(formData.startDate).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      结束日期
                    </Typography>
                    <Typography variant="body2">
                      {formData.endDate
                        ? new Date(formData.endDate).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      目标平台
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {formData.targetPlatforms?.map((platform) => {
                        const platformInfo = platformOptions.find(
                          (p) => p.value === platform
                        );
                        return (
                          <Chip
                            key={platform}
                            label={platformInfo?.label || platform}
                            size="small"
                          />
                        );
                      })}
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      目标受众
                    </Typography>
                    <List dense sx={{ mt: 1 }}>
                      <ListItem>
                        <ListItemText
                          primary="年龄范围"
                          secondary={formData.targetAudience?.ageRange || '-'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="性别"
                          secondary={
                            formData.targetAudience?.gender === 'all'
                              ? '全部'
                              : formData.targetAudience?.gender === 'male'
                              ? '男性'
                              : '女性'
                          }
                        />
                      </ListItem>
                      {formData.targetAudience?.locations &&
                        formData.targetAudience.locations.length > 0 && (
                          <ListItem>
                            <ListItemText
                              primary="目标地区"
                              secondary={formData.targetAudience.locations
                                .map(
                                  (loc) =>
                                    locationOptions.find((l) => l.value === loc)
                                      ?.label || loc
                                )
                                .join(', ')}
                            />
                          </ListItem>
                        )}
                    </List>
                  </Grid>

                  {formData.requiredHashtags &&
                    formData.requiredHashtags.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                          必需标签
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          {formData.requiredHashtags.map((hashtag) => (
                            <Chip
                              key={hashtag}
                              label={`#${hashtag}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Grid>
                    )}
                </Grid>
              </PreviewCard>
            </CardContent>
          </StepContentCard>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          创建活动
        </Typography>
        <Typography variant="body1" color="text.secondary">
          按照步骤填写活动信息，创建您的广告投放活动
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      {renderStepContent(activeStep)}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
        >
          上一步
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained">
              下一步
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={createMutation.isPending}
              startIcon={
                createMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CheckIcon />
                )
              }
            >
              {createMutation.isPending ? '提交中...' : '提交活动'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignCreatePage;
